#ifndef LIB_H
#define LIB_H

#include <iostream>
#include <filesystem>
#include <nlohmann/json.hpp>
#include <vector>
#include <string>
#include <vtkPolyDataReader.h>
#include <vtkPolyData.h>
#include <vtkPoints.h>
#include <vtkCellArray.h>
#include <vtkPointData.h>
#include "polygon.h"

using json = nlohmann::json;
namespace fs = std::filesystem;

template <typename T>
inline void print(T value) { std::cout << value << std::endl; }
template <typename T, typename... Args>
inline void print(T first, Args... args)
{
    std::cout << first << " ";
    print(args...);
}

template <typename T>
inline T calculate_norm(const T *vector, int size)
{
    static_assert(std::is_arithmetic<T>::value, "T must be a numeric type");
    T sum = 0;
    for (int i = 0; i < size; ++i)
    {
        sum += vector[i] * vector[i];
    }
    return std::sqrt(sum);
}

// 最大値と平均値を計算する関数
inline std::pair<double, double> calc_max_mean(const std::vector<std::vector<double>> &displacements)
{
    double global_max = std::numeric_limits<double>::lowest(); // 初期値: 最小の可能な値
    double total_sum = 0.0;                                    // 合計値
    size_t total_count = 0;                                    // 全データの個数

    for (const auto &disp : displacements)
    {
        if (!disp.empty())
        {
            // 部分配列の最大値を計算し、全体の最大値を更新
            double local_max = *std::max_element(disp.begin(), disp.end());
            global_max = std::max(global_max, local_max);
            // 部分配列の合計を計算し、全体の合計に加算
            total_sum += std::accumulate(disp.begin(), disp.end(), 0.0);
            // 全データ個数をカウント
            total_count += disp.size();
        }
    }
    // 平均値を計算（データがない場合 0）
    double global_mean = (total_count > 0) ? (total_sum / total_count) : 0.0;
    return {global_max, global_mean};
}

inline std::vector<std::string> get_file_list(const std::string &folder_path)
{
    std::vector<std::string> file_list;

    try
    {
        // フォルダーの存在確認
        if (!fs::exists(folder_path))
        {
            std::cerr << "指定されたフォルダーが存在しません:" << folder_path << std::endl;
            return file_list; // 空のリストを返す
        }

        // フォルダー内のファイル一覧を取得
        // このイテレータは指定されたディレクトリ内のファイルを走査するが、ディレクトリ内のディレクトリをさらに走査はしない。
        // 再帰的にディレクトリを走査する場合は、 std::filesystem::recursive_directory_iterator クラスを使用する。
        for (const auto &entry : fs::directory_iterator(folder_path))
        {
            file_list.push_back(entry.path().string());
        }
    }
    catch (const fs::filesystem_error &e)
    {
        std::cerr << "エラー: ファイルリストの取得に失敗しました。" << std::endl;
    }

    return file_list;
}

// 文字列に変換する関数
inline std::string convert_to_comma_separated_string(const std::vector<double> &values)
{
    std::ostringstream oss;
    if (!values.empty())
    {
        oss << static_cast<int>(std::round(values[0] * 1000));
        for (size_t i = 1; i < values.size(); ++i)
        {
            oss << "," << static_cast<int>(std::round(values[i] * 1000));
        }
    }
    return oss.str();
}

// GeoJSONファイルを出力する関数
inline void output_geo_json(
    const std::unordered_map<std::string, Polygon> &hash_map,
    const std::string &output_file_name)
{
    print("GeoJSON ファイルを作成します:", output_file_name);

    json geojson;

    // GeoJSON の基本構造
    geojson["type"] = "FeatureCollection";
    geojson["name"] = "df_geo_vtk_data";

    geojson["crs"] = {
        {"type", "name"},
        {"properties", {{"name", "urn:ogc:def:crs:EPSG::6677"}}}};

    geojson["features"] = json::array();
    for (const auto &[key, polygon] : hash_map)
    {
        json feature;
        feature["type"] = "Feature";

        feature["properties"] = {
            {"p", polygon.polygon_index},
            {"x", convert_to_comma_separated_string(polygon.displacement_max)},
            {"m", convert_to_comma_separated_string(polygon.displacement_mean)}};

        // ジオメトリ
        feature["geometry"] = {
            {"type", "Point"},
            {"coordinates", {std::get<0>(polygon.centroid), std::get<1>(polygon.centroid), std::get<2>(polygon.centroid)}}};

        geojson["features"].push_back(feature);
    }

    // GeoJSON ファイルを書き出す
    std::ofstream output_file(output_file_name);
    if (output_file.is_open())
    {
        // output_file << geojson.dump(2); // インデント付きで出力
        output_file << geojson.dump(-1);
        output_file.close();
        print("GeoJSON ファイルが作成されました:", output_file_name);
    }
    else
    {
        std::cerr << "GeoJSON ファイルを作成できません:" << output_file_name << std::endl;
    }
}

inline void read_vtk_file(const std::string &file_name, std::unordered_map<std::string, Polygon> &polygon_hash_map, std::size_t file_index)
{
    // VTKファイルリーダーを作成
    auto reader = vtkSmartPointer<vtkPolyDataReader>::New();
    reader->SetFileName(file_name.c_str());
    // ファイルを読み込む
    reader->Update();

    // vtkデータを取得
    auto vtk_data = reader->GetOutput();
    if (!vtk_data)
    {
        std::cerr << "VTKファイルの読み込みに失敗しました。" << std::endl;
    }

    // ポイントデータを取得
    auto *point_dataset = vtk_data->GetPointData();
    if (!point_dataset)
    {
        std::cerr << "ファイルにポイントデータがありません。" << std::endl;
    }

    // 利用可能な配列の名前を表示
    int number_of_arrays = point_dataset->GetNumberOfArrays();
#ifdef DEBUG
    print("Number of arrays:", number_of_arrays);
    for (int index = 0; index < number_of_arrays; ++index)
    {
        const char *array_name = point_dataset->GetArrayName(index);
        print("Array", index, ":", (array_name ? array_name : "Unnamed"));
    }
#endif
    // displacement[m]を取得
    vtkDataArray *displacement_m = point_dataset->GetArray("displacement[m]");
    if (displacement_m)
    {
#ifdef DEBUG
        print("Array name:", (displacement_m->GetName() ? displacement_m->GetName() : "Unnamed"));
        print("Number of tuples:", displacement_m->GetNumberOfTuples());
        print("Number of components:", displacement_m->GetNumberOfComponents());
        print("Data type:", displacement_m->GetDataTypeAsString());

        // 最初の3つのポイントの値を表示
        vtkIdType num_tuples = displacement_m->GetNumberOfTuples();
        // すべてのポイントの値を表示
        // for (vtkIdType j = 0; j < num_tuples; ++j)
        for (vtkIdType index = 0; index < std::min(num_tuples, static_cast<vtkIdType>(3)); ++index)
        {
            auto *vector = displacement_m->GetTuple(index); // 各タプル（成分）の値を取得
            print("Value at point", index, ": (");
            print("Vector value: (", vector[0], ",", vector[1], ",", vector[2], ")");
        }
#endif
    }
    else
    {
        std::cerr << "ポイントデータ配列を取得できませんでした。" << std::endl;
    }

    // ポイントデータの読み込み
    auto points = vtk_data->GetPoints();
    if (points)
    {
#ifdef DEBUG
        // check the points
        print("Points:", points->GetNumberOfPoints());
        double coords[3];
        for (vtkIdType i = 0; i < 1; ++i)
        {
            points->GetPoint(i, coords);
            print("Point", i, ":", coords[0], coords[1], coords[2]);
        }
#endif
    }
    else
    {
        std::cerr << "VTKファイルにポイントが見つかりません。" << std::endl;
    }

    // ポリゴンデータの読み込み
    auto cells = vtk_data->GetPolys();
    if (cells && cells->GetNumberOfCells() > 0)
    {
        print("Polygons:", cells->GetNumberOfCells());
        cells->InitTraversal();
        vtkIdType npts;
        const vtkIdType *pts;

        int polygon_index = 0;
        while (cells->GetNextCell(npts, pts))
        {
            polygon_index++;
            // 12で割って0ならブレイク (1/12)に間引く
            if (polygon_index % 12 != 0)
                continue;

            // 各ポリゴンの頂点情報を収集
            std::vector<std::tuple<double, double, double>>
                coordinates;
            std::vector<std::vector<double>> displacements;

            // データは3つある
            // for (vtkIdType j = 0; j < npts; ++j)
            for (vtkIdType j = 0; j < 1; ++j) // 1つの頂点のみ処理する
            {
                // 頂点の座標を取得
                double coords[3];
                points->GetPoint(pts[j], coords);
                coordinates.emplace_back(coords[0], coords[1], coords[2]);
                // 変位データを取得
                double *disp = displacement_m->GetTuple(pts[j]);
                // ノルムを計算
                double norm = calculate_norm(disp, 3);
                // ノルムを displacements に格納
                displacements.emplace_back(std::vector<double>{norm});
            }

            // Polygon 構造体のインスタンスを作成
            Polygon polygon(polygon_index, coordinates);
            // 変位データを更新
            auto [max_val, mean_val] = calc_max_mean(displacements);
            polygon.add_displacement_max(max_val);
            polygon.add_displacementMean(mean_val);
            // ハッシュマップ用のキーを生成
            const std::string key = polygon.coordinates_to_string();

            // 事前にキーが存在するか確認
            auto it = polygon_hash_map.find(key);
            if (it != polygon_hash_map.end())
            {
                // キーが既に存在する場合の処理
                if (polygon.get_displacement_max().size() >= file_index)
                {
                    continue;
                }
                it->second.add_displacement_max(polygon.get_displacement_max().at(0));
                it->second.add_displacementMean(polygon.get_displacement_mean().at(0));
            }
            else
            {
                polygon_hash_map.insert({polygon.coordinates_to_string(), polygon});
            }

            // デバッグ出力
            // print("Polygon:", polygon);
            // 制限
            // if (polygon_index > 50)
            // {
            //     break;
            // }
        }
    }
    else
    {
        std::cerr << "No polygons found in the VTK file." << std::endl;
    }
}
#endif