.PHONY: help vtk output vec build

help: ## このヘルプを表示
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

vtk: ## vtk.geojsonを作成
	#cd native && ./build.sh
	cd native && ./build/main /workspaces/vtk-study/program/VTK/case1

output: ## output.geojsonを作成
	python3 main.py -f "./(keep)vtk.geojson" -s "./SHP/case1/merged_shapefile.shp"

vec: ## vectorタイルを作成
	rm -rf VEC
	# ディレクトリ形式 このシステムでは 14まで必要
	tippecanoe -e VEC -pC -Z4 -z14 -pf -pk output.geojson

build: ## ビルド
	cd native && ./build.sh
