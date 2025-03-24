import { TagType } from './tag';

export interface TicketType {
  name: string;
  number: string;
  tags: TagType[];
  ticketId: string;
}