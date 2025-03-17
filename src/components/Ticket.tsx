import Tag from "./Tag";
import "../styles/ticket";

const Ticket: React.FC = () => {
  return (
    <div className="ticket-group">
      <div className="ticket-title">Ticket Title</div>

      <div className="ticket-tags">
        <Tag name={"TAG1"} color={"purple"} />
        <Tag name={"TAG2"} color={"blue"} />
        <Tag name={"TAG3"} color={"green"} />
      </div>

      <div className="ticket-type">TODO-1</div>
    </div>
  );
};

export default Ticket;
