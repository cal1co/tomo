import { TagType } from './tag';

export interface TicketType {
  ticketId: string;
  name: string;
  number: string;
  tags: TagType[];
  summary?: string;
  attachments?: AttachmentType[];
}

export interface AttachmentType {
  id: string;
  name: string;
  type: string;
  dataUrl: string;
}