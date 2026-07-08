import { randomUUID } from "node:crypto";
import type { AgentExecutionContext } from "@pcc/schemas";
import { RequestObject } from "@pcc/schemas";
import type { PropertyContext } from "@pcc/property-context";

export interface RequestCaptureInput {
  serviceId: string;
  guestId?: string;
  guestName?: string;
  providedFields: Record<string, unknown>;
  sourceMessageId: string;
  propertyContext: PropertyContext;
}

// Directive §5.6 hard rule: cannot confirm booking, cannot set final availability, must preserve
// source message ids. Status is always pending_confirmation on creation.
export const requestCaptureAgent = {
  id: "request-capture",

  async execute(input: RequestCaptureInput, _context: AgentExecutionContext): Promise<RequestObject> {
    const service = input.propertyContext.serviceMenu.find((svc) => svc.service_id === input.serviceId);
    if (!service) {
      throw new Error(`Unknown service_id "${input.serviceId}" — not in service menu`);
    }

    const missingFields = service.required_fields.filter(
      (field) => input.providedFields[field] === undefined
    );

    return RequestObject.parse({
      request_id: randomUUID(),
      type: service.service_id,
      status: "pending_confirmation",
      guest_id: input.guestId,
      guest_name: input.guestName,
      fields: input.providedFields,
      missing_fields: missingFields,
      assigned_team: service.assigned_team,
      source_message_ids: [input.sourceMessageId],
      created_at: new Date().toISOString(),
    });
  },
};
