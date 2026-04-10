import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const modules = {
  toolbar: [
    [{ header: [1, 2, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link"],
    ["clean"],
  ],
};

type Props = {
  value: string;
  onChange?: (html: string) => void;
  readOnly?: boolean;
  placeholder?: string;
};

export function WorkoutRichEditor({ value, onChange, readOnly, placeholder }: Props) {
  return (
    <div className="workout-rich-editor">
      <ReactQuill
        theme="snow"
        value={value || ""}
        onChange={onChange ?? (() => {})}
        readOnly={readOnly}
        modules={readOnly ? { toolbar: false } : modules}
        placeholder={placeholder}
      />
    </div>
  );
}
