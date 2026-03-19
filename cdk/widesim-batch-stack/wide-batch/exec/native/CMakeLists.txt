cmake_minimum_required(VERSION 3.19.0)
message(STATUS "CMake version: ${CMAKE_VERSION}")

# オプションの設定
option(DEBUG "Enable debug mode" OFF)

# DEBUG フラグに基づく処理
if (DEBUG)
    message(STATUS "Debug mode enabled")
    # コンパイラに DEBUG マクロを定義
    add_compile_definitions(DEBUG)
    # Debug ビルドタイプを明示的に設定
    set(CMAKE_BUILD_TYPE Debug)
else()
    message(STATUS "Debug mode disabled")
    set(CMAKE_BUILD_TYPE Release)
endif()

# プロジェクト設定
project(main VERSION 0.1 LANGUAGES CXX)

# C++20の設定
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# ソースファイルの設定
file(GLOB cpu_source_files "${CMAKE_SOURCE_DIR}/*.cpp")
file(GLOB gpu_source_files "${CMAKE_SOURCE_DIR}/*.cu")

# OpenMPを有効にするかどうかのオプション (デフォルトはOFF)
option(ENABLE_OPENMP "Enable OpenMP support" OFF)

# OpenMPの設定
if (ENABLE_OPENMP)
    find_package(OpenMP QUIET)
    if(OpenMP_FOUND)
        message(STATUS "OpenMP found: ${OpenMP_CXX_FLAGS}")
        target_compile_options(${PROJECT_NAME} PUBLIC ${OpenMP_CXX_FLAGS})
        target_link_libraries(${PROJECT_NAME} PUBLIC OpenMP::OpenMP_CXX)
    else()
        message(WARNING "OpenMP not found, but ENABLE_OPENMP was ON")
    endif()
else()
    message(STATUS "OpenMP support disabled.")
endif()

# VTKの設定
find_package(VTK REQUIRED COMPONENTS 
    CommonCore 
    FiltersSources 
    IOXML 
    IOLegacy
    RenderingOpenGL2
)

if (VTK_FOUND)
    message(STATUS "VTK found: ${VTK_VERSION}")
    include_directories(${VTK_INCLUDE_DIRS})
else()
    message(FATAL_ERROR "VTK not found. Please check the installation.")
endif()

add_executable(${PROJECT_NAME} ${cpu_source_files})

# 最適化オプションの追加
if (CMAKE_CXX_COMPILER_ID STREQUAL "GNU" OR CMAKE_CXX_COMPILER_ID STREQUAL "Clang")
    target_compile_options(${PROJECT_NAME} PUBLIC -O3 -march=native)
elseif (CMAKE_CXX_COMPILER_ID STREQUAL "MSVC")
    target_compile_options(${PROJECT_NAME} PUBLIC /O2 /Ot)
endif()

# VTKライブラリのリンク
target_link_libraries(${PROJECT_NAME} PUBLIC ${VTK_LIBRARIES})
