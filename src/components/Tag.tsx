import "../styles/Tag";
import { TagType, getTagStyle } from "../types/BoardTypes";

const Tag: React.FC<TagType> = ({ name, color, id }) => {
  return (
    <div
      className="tag-group"
      key={id}
      style={{
        background: getTagStyle(color).background,
        color: getTagStyle(color).color,
      }}
    >
      {name}
    </div>
  );
};

export default Tag;
