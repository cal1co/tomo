
import { v4 as uuid } from "uuid";
import { TagType, TicketType } from "./types";

const defaultTags: TagType[] = [
  { color: "purple", name: "feature", id: "1" },
  { color: "green", name: "bug", id: "2" },
  { color: "blue", name: "task", id: "3" },
];

export function createTestTicket(name: string = "Test Ticket", columnPrefix: string = "TODO"): TicketType {
  const ticketId = uuid();
  const ticketNumber = `${columnPrefix}-${Math.floor(Math.random() * 1000)}`;
  
  return {
    name,
    number: ticketNumber,
    tags: defaultTags.slice(0, Math.floor(Math.random() * 3) + 1),
    ticketId
  };
}

export function loadTestData(addCard: Function): void {
  console.log("Loading test data...");
  
  addCard({
    columnId: "todo",
    ticket: createTestTicket("Implement storage service", "TODO"),
    trigger: "keyboard"
  });
  
  addCard({
    columnId: "todo", 
    ticket: createTestTicket("Add iCloud sync", "TODO"),
    trigger: "keyboard"
  });
  
  addCard({
    columnId: "done",
    ticket: createTestTicket("Initial setup", "DONE"),
    trigger: "keyboard"
  });
  
  console.log("Test data loaded");
}

if (typeof window !== 'undefined') {
  (window as any).testBoardPersistence = function() {
    console.log("This utility is available in the browser console for testing");
    console.log("Current board state can be viewed by checking localStorage or calling:");
    console.log("window.electron.getBoardState().then(console.log)");
  };
}