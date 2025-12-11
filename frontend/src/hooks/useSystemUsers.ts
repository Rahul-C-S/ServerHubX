import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { systemUsersApi } from '@/lib/api';
import type { CreateSystemUserRequest, AddSSHKeyRequest } from '@/types';

const SYSTEM_USERS_KEY = 'system-users';

export function useSystemUsers(ownerId?: string) {
  return useQuery({
    queryKey: [SYSTEM_USERS_KEY, { ownerId }],
    queryFn: () => systemUsersApi.list(ownerId),
  });
}

export function useSystemUser(id: string) {
  return useQuery({
    queryKey: [SYSTEM_USERS_KEY, id],
    queryFn: () => systemUsersApi.get(id),
    enabled: !!id,
  });
}

export function useCreateSystemUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSystemUserRequest) => systemUsersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SYSTEM_USERS_KEY] });
    },
  });
}

export function useUpdateSystemUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateSystemUserRequest & { status?: string }>;
    }) => systemUsersApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SYSTEM_USERS_KEY, variables.id] });
      queryClient.invalidateQueries({ queryKey: [SYSTEM_USERS_KEY] });
    },
  });
}

export function useDeleteSystemUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => systemUsersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SYSTEM_USERS_KEY] });
    },
  });
}

export function useSetSystemUserPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      systemUsersApi.setPassword(id, password),
  });
}

export function useSystemUserSSHKeys(systemUserId: string) {
  return useQuery({
    queryKey: [SYSTEM_USERS_KEY, systemUserId, 'ssh-keys'],
    queryFn: () => systemUsersApi.listSSHKeys(systemUserId),
    enabled: !!systemUserId,
  });
}

export function useAddSSHKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      systemUserId,
      data,
    }: {
      systemUserId: string;
      data: AddSSHKeyRequest;
    }) => systemUsersApi.addSSHKey(systemUserId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [SYSTEM_USERS_KEY, variables.systemUserId, 'ssh-keys'],
      });
    },
  });
}

export function useRemoveSSHKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      systemUserId,
      keyId,
    }: {
      systemUserId: string;
      keyId: string;
    }) => systemUsersApi.removeSSHKey(systemUserId, keyId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [SYSTEM_USERS_KEY, variables.systemUserId, 'ssh-keys'],
      });
    },
  });
}
