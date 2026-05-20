import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { GroupsService } from "./groups.service.js";
import type {
  CreateGroupDto,
  CreateInvitationDto,
  JoinGroupDto,
  RefreshJwtDto,
  UpdateGovernanceDto,
  UpdateDisplayNameDto,
  PutDocSnapshotDto,
} from "./groups.dto.js";

@Controller()
export class GroupsController {
  constructor(@Inject(GroupsService) private readonly groups: GroupsService) {}

  @Post("groups")
  createGroup(@Body() body: CreateGroupDto) {
    return this.groups.createGroup(body);
  }

  @Post("users/me/display-name")
  updateDisplayName(@Body() body: UpdateDisplayNameDto) {
    return this.groups.updateMemberDisplayName(body.node_id, body.display_name);
  }

  @Get("users/me/groups")
  listMyGroups(
    @Query("node_id") nodeId: string,
    @Query("role") role: "owner" | "member",
  ) {
    return this.groups.listGroupsForNode(nodeId, role ?? "member");
  }

  @Get("users/me/groups/all")
  listAllGroups(@Query("node_id") nodeId: string) {
    return this.groups.listAllGroupsForNode(nodeId);
  }

  @Get("groups/:id/governance")
  governance(@Param("id") id: string, @Query("caller_node_id") callerNodeId: string) {
    return this.groups.getGovernance(id, callerNodeId);
  }

  @Post("groups/:id/governance")
  updateGovernance(@Param("id") id: string, @Body() body: UpdateGovernanceDto) {
    return this.groups.updateGovernance(id, body);
  }

  @Post("groups/:id/dissolve")
  dissolve(
    @Param("id") id: string,
    @Query("caller_node_id") callerNodeId: string,
  ) {
    return this.groups.dissolveGroup(id, callerNodeId);
  }

  @Get("groups/:id/docs/:docId/role-acls")
  docRoleAcls(
    @Param("id") id: string,
    @Param("docId") docId: string,
    @Query("caller_node_id") callerNodeId: string,
  ) {
    return this.groups.getDocRoleAcls(id, docId, callerNodeId);
  }

  @Post("groups/:id/join")
  join(@Param("id") id: string, @Body() body: JoinGroupDto) {
    return this.groups.joinGroup(id, body);
  }

  @Post("groups/:id/invitations")
  invite(
    @Param("id") id: string,
    @Query("inviter_node_id") inviterNodeId: string,
    @Body() body: CreateInvitationDto,
  ) {
    return this.groups.createInvitation(id, inviterNodeId, body);
  }

  @Get("users/me/invitations")
  listInvitations(@Query("node_id") nodeId: string) {
    return this.groups.listInvitations(nodeId);
  }

  @Post("invitations/:invitationId/accept")
  accept(@Param("invitationId") invitationId: string, @Body() body: JoinGroupDto) {
    return this.groups.acceptInvitation(invitationId, body);
  }

  @Post("invitations/:invitationId/reject")
  reject(
    @Param("invitationId") invitationId: string,
    @Query("node_id") nodeId: string,
  ) {
    return this.groups.rejectInvitation(invitationId, nodeId);
  }


  @Get("groups/:id/docs/:docId/snapshot")
  getDocSnapshot(
    @Param("id") id: string,
    @Param("docId") docId: string,
    @Query("node_id") nodeId: string,
  ) {
    return this.groups.getDocSnapshot(id, docId, nodeId);
  }

  @Post("groups/:id/docs/:docId/snapshot")
  putDocSnapshot(
    @Param("id") id: string,
    @Param("docId") docId: string,
    @Body() body: PutDocSnapshotDto,
  ) {
    return this.groups.putDocSnapshot(id, docId, body.node_id, body.state_update_base64);
  }


  @Get("groups/:id/docs/:docId/snapshot")
  getDocSnapshot(
    @Param("id") id: string,
    @Param("docId") docId: string,
    @Query("node_id") nodeId: string,
  ) {
    return this.groups.getDocSnapshot(id, docId, nodeId);
  }

  @Post("groups/:id/docs/:docId/snapshot")
  putDocSnapshot(
    @Param("id") id: string,
    @Param("docId") docId: string,
    @Body() body: PutDocSnapshotDto,
  ) {
    return this.groups.putDocSnapshot(id, docId, body.node_id, body.state_update_base64);
  }

  @Post("groups/:id/jwt/refresh")
  refreshJwt(@Param("id") id: string, @Body() body: RefreshJwtDto) {
    return this.groups.refreshJwt(id, body);
  }

  @Post("groups/:id/docs/:docId/rotate-key")
  rotateKey(
    @Param("id") id: string,
    @Param("docId") docId: string,
    @Query("caller_node_id") callerNodeId: string,
  ) {
    return this.groups.rotateDocKey(id, callerNodeId, docId);
  }

  @Get("groups/:id/members")
  members(@Param("id") id: string) {
    return this.groups.listMembers(id);
  }

  @Get("groups/:id/tree")
  tree(@Param("id") id: string, @Query("node_id") nodeId: string) {
    return this.groups.getTree(id, nodeId);
  }

  @Post("groups/:id/rpc")
  rpc(
    @Param("id") id: string,
    @Query("caller_node_id") callerNodeId: string,
    @Body() body: unknown,
  ) {
    return this.groups.operableRpc(id, callerNodeId, body);
  }
}
