import bpy

# マテリアル作成
mat_r = bpy.data.materials.new("frame")
mat_r.diffuse_color = (161 / 255, 75 / 255, 44 / 255, 1.0)

mat_w = bpy.data.materials.new("white")
mat_w.diffuse_color = (1, 1, 1, 1.0)

# メッシュ作成
verts = [
    (0.0800, 0.0345, 2.9467),
    (-0.0250, 0.0344, 2.9477),
    (-0.0250, -0.0706, 2.9470),
    (0.0800, -0.0705, 2.9461),
    (0.0525, 0.0525, -0.0002),
    (-0.0525, 0.0525, 0.0008),
    (-0.0525, -0.0525, 0.0002),
    (0.0525, -0.0525, -0.0008),
]

faces = [
    (0, 1, 2, 3),
    (4, 5, 6, 7),
    (0, 4, 5, 1),
    (1, 5, 6, 2),
    (2, 6, 7, 3),
    (3, 7, 4, 0),
]

mesh = bpy.data.meshes.new("Cube_mesh")
mesh.from_pydata(verts, [], faces)
mesh.update(calc_edges=True)

# オブジェクト作成
obj = bpy.data.objects.new("Custom_Object", mesh)

# マテリアルをメッシュに割り当て
mesh.materials.append(mat_r)  # 1つ目のマテリアルを適用
mesh.materials.append(mat_w)  # 必要なら2つ目を追加（オブジェクト単位で管理可能）

# シーンにオブジェクトを追加
bpy.context.collection.objects.link(obj)

# オブジェクトを選択
bpy.context.view_layer.objects.active = obj
obj.select_set(True)
