#ifndef POLYGON_H
#define POLYGON_H

#include <iostream>
#include <vector>
#include <tuple>
#include <string>

// Polygon 構造体の定義
struct Polygon
{
    int polygon_index;                                           // Polygon Index
    std::vector<std::tuple<double, double, double>> coordinates; // 各頂点の座標 (x, y, z)
    std::tuple<double, double, double> centroid;                 // ポリゴンの重心
    std::vector<double> displacement_max;                        // 各時刻の最大変位
    std::vector<double> displacement_mean;                       // 各時刻の平均変位

    // コンストラクタ
    Polygon(int index, std::vector<std::tuple<double, double, double>> coords)
        : polygon_index(index), coordinates(coords), centroid(calculate_centroid(coords)) {}

    // 重心を計算する静的関数
    static std::tuple<double, double, double> calculate_centroid(const std::vector<std::tuple<double, double, double>> &coords)
    {
        double x_sum = 0.0, y_sum = 0.0, z_sum = 0.0;
        int n = coords.size();

        for (const auto &coord : coords)
        {
            x_sum += std::get<0>(coord);
            y_sum += std::get<1>(coord);
            z_sum += std::get<2>(coord);
        }

        if (n > 0)
        {
            return {x_sum / n, y_sum / n, z_sum / n};
        }
        else
        {
            return {0.0, 0.0, 0.0};
        }
    }

    // coordinates を文字列に変換
    std::string coordinates_to_string() const
    {
        std::ostringstream oss;
        oss << std::fixed << std::setprecision(15); // Double型の精度を指定
        for (const auto &coord : coordinates)
        {
            oss << "(" << std::get<0>(coord) << ", " << std::get<1>(coord) << ", " << std::get<2>(coord) << ") ";
        }
        return oss.str();
    }

    // displacement_max の getter
    std::vector<double> get_displacement_max() const
    {
        return displacement_max;
    }

    // displacement_max の setter
    void set_displacement_max(const std::vector<double> &values)
    {
        displacement_max = values;
    }

    // displacement_mean の getter
    std::vector<double> get_displacement_mean() const
    {
        return displacement_mean;
    }

    // displacement_mean の setter
    void set_displacement_mean(const std::vector<double> &values)
    {
        displacement_mean = values;
    }

    // displacement_max に単一値を追加
    void add_displacement_max(double value)
    {
        displacement_max.push_back(value);
    }

    // displacement_mean に単一値を追加
    void add_displacementMean(double value)
    {
        displacement_mean.push_back(value);
    }

    // ストリーム挿入演算子のオーバーロード
    friend std::ostream &operator<<(std::ostream &os, const Polygon &poly)
    {
        os << "Polygon Index: " << poly.polygon_index << "\n";
        os << "Coordinates:\n";
        for (const auto &coord : poly.coordinates)
        {
            os << "(" << std::get<0>(coord) << ", " << std::get<1>(coord) << ", " << std::get<2>(coord) << ") ";
        }
        os << "\nCentroid: (" << std::get<0>(poly.centroid) << ", " << std::get<1>(poly.centroid)
           << ", " << std::get<2>(poly.centroid) << ")\n";

        os << "Displacement Max: ";
        for (const auto &val : poly.displacement_max)
        {
            os << val << " ";
        }
        os << "\nDisplacement Mean: ";
        for (const auto &val : poly.displacement_mean)
        {
            os << val << " ";
        }
        os << std::endl;

        return os;
    }
};
#endif