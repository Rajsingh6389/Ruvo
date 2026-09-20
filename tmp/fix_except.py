file_path = r'C:\Users\rm273\Downloads\RuVo\ruvo\src\main\java\Ranex\ruvo\service\RazorpayRouteService.java'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('throw new RuntimeException(', 'throw new IllegalStateException(')
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated successfully.")
