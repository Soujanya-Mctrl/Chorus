import os

# Define code file extensions
CODE_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx",
    ".java", ".cpp", ".c", ".cs",
    ".html", ".css", ".json",
    ".go", ".rs", ".php", ".rb",
    ".swift", ".kt", ".m", ".sh"
}

def is_code_file(filename):
    _, ext = os.path.splitext(filename)
    return ext.lower() in CODE_EXTENSIONS


def combine_code_files(input_folder, output_file="combined_code.txt"):
    with open(output_file, "w", encoding="utf-8") as out_file:

        for root, dirs, files in os.walk(input_folder):
            for file in files:
                file_path = os.path.join(root, file)

                # Write file path as heading
                out_file.write(f"\n{'='*80}\n")
                out_file.write(f"FILE: {file_path}\n")
                out_file.write(f"{'='*80}\n\n")

                if is_code_file(file):
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read()
                            out_file.write(content + "\n")
                    except Exception as e:
                        out_file.write(f"[Error reading file: {e}]\n")
                else:
                    # Not a code file → just leave empty (as you wanted)
                    pass

    print(f"✅ Combined file created: {output_file}")


if __name__ == "__main__":
    folder_path = input("Enter folder path: ").strip()

    if not os.path.exists(folder_path):
        print("❌ Invalid folder path!")
    else:
        combine_code_files(folder_path)