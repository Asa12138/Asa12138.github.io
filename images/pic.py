import os
from PIL import Image, ImageOps
from pathlib import Path
import argparse

def convert_images_in_subdirectories(root_path, target_format='webp', quality=80, delete_original=True, folders=None):
    """
    转换指定根路径下所有子目录中的图片格式
    
    Args:
        root_path: 根目录路径
        target_format: 目标格式，默认为webp
        quality: 图片质量（1-100），默认为80
        delete_original: 是否删除原图，默认为True
    """
    root_dir = Path(root_path)
    
    # 检查根目录是否存在
    if not root_dir.exists():
        print(f"错误：目录 {root_path} 不存在")
        return
    
    # 获取所有子目录（不包括根目录本身）
    if folders:
        subdirectories = []
        for name in folders:
            subdir = root_dir / name
            if subdir.resolve().parent != root_dir.resolve() or not subdir.is_dir():
                raise ValueError(f'必须指定根目录内的现有旅程目录：{name}')
            subdirectories.append(subdir)
    else:
        subdirectories = [d for d in root_dir.iterdir() if d.is_dir() and d.name != 'atlas-thumbs']
    
    if not subdirectories:
        print(f"在 {root_path} 下未找到子目录")
        return
    
    total_converted = 0
    total_errors = 0
    
    for subdir in subdirectories:
        print(f"\n处理子目录: {subdir.name}")
        converted_in_dir = 0
        errors_in_dir = 0
        
        # 支持的图片格式[1,5](@ref)
        supported_formats = ('.jpg', '.jpeg', '.png', '.bmp', '.tiff')
        
        # 遍历子目录中的所有文件[5,6](@ref)
        for file_path in subdir.iterdir():
            if file_path.is_file() and file_path.suffix.lower() in supported_formats:
                try:
                    # 打开图片并处理EXIF方向信息[1](@ref)
                    with Image.open(file_path) as img:
                        # 修正图片方向（解决旋转问题）
                        img = ImageOps.exif_transpose(img)
                        
                        # 构建输出路径（相同文件名，不同扩展名）
                        output_path = file_path.with_suffix(f'.{target_format.lower()}')
                        
                        # 保存为目标格式[1,3](@ref)
                        if target_format.lower() == 'jpg' or target_format.lower() == 'jpeg':
                            # 对于JPEG格式，需要转换为RGB模式
                            if img.mode != 'RGB':
                                img = img.convert('RGB')
                            img.save(output_path, 'JPEG', quality=quality)
                        else:
                            save_kwargs = {'quality': quality} if target_format.lower() == 'webp' else {}
                            img.save(output_path, target_format.upper(), **save_kwargs)
                    
                    # 删除原图[1](@ref)
                    if delete_original:
                        os.remove(file_path)
                        print(f"✓ 转换并删除: {file_path.name} → {output_path.name}")
                    else:
                        print(f"✓ 转换: {file_path.name} → {output_path.name}")
                    
                    converted_in_dir += 1
                    
                except Exception as e:
                    print(f"✗ 处理失败 {file_path.name}: {str(e)}")
                    errors_in_dir += 1
        
        print(f"子目录 {subdir.name} 完成: {converted_in_dir} 张转换, {errors_in_dir} 个错误")
        total_converted += converted_in_dir
        total_errors += errors_in_dir
    
    print(f"\n{'='*50}")
    print(f"批量转换完成!")
    print(f"总转换图片: {total_converted} 张")
    print(f"总错误数: {total_errors}")
    print(f"根目录 {root_path} 下的文件保持不变")

def main():
    """主函数，处理命令行参数"""
    parser = argparse.ArgumentParser(description='批量转换图片格式')
    parser.add_argument('--path', '-p', default=str(Path(__file__).resolve().parent),
                       help='要处理的根目录路径')
    parser.add_argument('--format', '-f', default='webp', choices=['webp', 'jpg', 'jpeg', 'png'],
                       help='目标图片格式（默认: webp）')
    parser.add_argument('--quality', '-q', type=int, default=80,
                       help='图片质量 1-100（默认: 80）')
    parser.add_argument('--keep-original', '-k', action='store_true',
                       help='保留原图（默认删除）')
    
    parser.add_argument('--folders', nargs='+', help='只处理这些旅程目录，例如 2607malaysia 2610wuyishan')
    args = parser.parse_args()
    
    # 验证质量参数
    if not 1 <= args.quality <= 100:
        print("错误：质量参数必须在 1-100 之间")
        return
    
    print(f"开始处理目录: {args.path}")
    print(f"目标格式: {args.format}")
    print(f"图片质量: {args.quality}")
    print(f"删除原图: {not args.keep_original}")
    print(f"{'='*50}")
    
    convert_images_in_subdirectories(
        root_path=args.path,
        target_format=args.format,
        quality=args.quality,
        delete_original=not args.keep_original,
        folders=args.folders
    )

if __name__ == "__main__":
    main()
