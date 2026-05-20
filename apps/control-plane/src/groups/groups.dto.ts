/** JSON bodies use snake_case per API docs. */
export interface CreateGroupDto {
  name: string;
  owner_node_id: string;
  owner_public_key: string;
  control_mode?: "owner_direct" | "proxy";
  proxy_base_url?: string;
}

export interface JoinGroupDto {
  node_id: string;
  public_key: string;
}

export interface CreateInvitationDto {
  invitee_node_id: string;
}

export interface RefreshJwtDto {
  node_id: string;
  doc_id: string;
}
