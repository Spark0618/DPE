export function shortNodeId(nodeId: string, len = 8): string {
  if (nodeId.length <= len) return nodeId;
  return `${nodeId.slice(0, len)}…`;
}

export function memberDisplayLabel(
  member: { node_id: string; display_name?: string },
  selfNodeId?: string,
): string {
  const name = member.display_name?.trim();
  if (name) {
    return selfNodeId && member.node_id === selfNodeId ? `${name}（我）` : name;
  }
  return shortNodeId(member.node_id, 10);
}

export function peerDisplayLabel(peer: { uid: string; name?: string }): string {
  const name = peer.name?.trim();
  return name || shortNodeId(peer.uid, 10);
}
