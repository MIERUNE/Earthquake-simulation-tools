#include <iostream>
#include <vector>
#include "lib.h"
#include "polygon.h"

int main(int argc, char *argv[])
{

  // 引数のチェック
  if (argc < 2)
  {
    std::cerr << "Usage: " << argv[0] << " <vtk folder_path>" << std::endl;
    return 1;
  }

  // 引数から folder_path を取得
  // auto folder_path = "/workspaces/vtk-study/program/VTK/case1";
  std::string folder_path = argv[1];
  print("Start..");
  print("Folder Path:", folder_path);

  // ファイル一覧を取得
  auto files = get_file_list(folder_path);
  // ファイル名でソート
  std::sort(files.begin(), files.end());

  // ポリゴンリスト
  std::vector<Polygon> polygon_list;
  // std::unordered_mapの宣言
  std::unordered_map<std::string, Polygon> polygon_hash_map;

  std::size_t index = 0;
  for (const auto &file : files)
  {
    index++;
    print("FileCount:", index, "File:", file);
    read_vtk_file(file, polygon_hash_map, index);
  }

  output_geo_json(polygon_hash_map, "vtk.geojson");
}
