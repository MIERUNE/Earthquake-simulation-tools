import geopandas as gpd
import argparse

if __name__ == "__main__":
    # 引数を設定
    parser = argparse.ArgumentParser(description="Process GeoJSON and Shapefile data.")
    parser.add_argument(
        "-f",
        "--file",
        type=str,
        required=True,  # 必須引数にする
        help="Path to the input GeoJSON file.",
    )
    parser.add_argument(
        "-s",
        "--shapefile",
        type=str,
        required=True,  # 必須引数
        help="Path to the input Shapefile.",
    )
    args = parser.parse_args()

    print("start..")
    # Shapefile のパスを指定
    # shp_file_path = "./SHP/case1/merged_shapefile.shp"
    # 引数から Shapefile のパスを取得
    shp_file_path = args.shapefile
    # GeoDataFrame に読み込む
    shp_gdf = gpd.read_file(shp_file_path)
    # 座標系を EPSG:4326 に変換
    shp_gdf = shp_gdf.to_crs(epsg=4326)
    # ポリゴンにユニークな ID を付与する（1から始まる連番）
    shp_gdf["p"] = range(1, len(shp_gdf) + 1)

    # ----------------------------
    # GeoJSONファイルを読み込む
    # geojson_path = "./(keep)vtk.geojson"
    # GeoJSONファイルを引数から取得して読み込む
    geojson_path = args.file

    vtk_geojeon = gpd.read_file(geojson_path)
    # EPSG:4326に変換
    df_vtk_geo = vtk_geojeon.to_crs("EPSG:4326")

    # ----------------------------
    # ポイントがどのポリゴンに内包されているかを判定
    points_within_polygons = gpd.sjoin(
        df_vtk_geo, shp_gdf, how="inner", predicate="within"
    )
    # x,m はコンマ区切りの文字列
    points_data_by_polygon = points_within_polygons.groupby("p_right").agg(
        displacement_max=("x", "first"), displacement_mean=("m", "first")
    )

    # SHPポリゴンのデータに結合
    shp_gdf["displacement_max"] = shp_gdf["p"].map(
        points_data_by_polygon["displacement_max"]
    )
    shp_gdf["displacement_mean"] = shp_gdf["p"].map(
        points_data_by_polygon["displacement_mean"]
    )

    # 結果を表示
    # print(shp_gdf)
    # GeoJSON形式で出力
    shp_gdf.to_file("output.geojson", driver="GeoJSON")
    # shp_gdf.to_csv("./check_csv/check.csv", index=False)

    print("end..")
