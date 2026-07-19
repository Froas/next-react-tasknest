import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('next-auth/react', () => authMocks);

import { AuthRequiredError, setApiAccessToken, usersApi } from './api';

describe('authenticated API requests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    authMocks.getSession.mockReset();
    authMocks.signOut.mockReset();
    setApiAccessToken(undefined);
  });

  it('reports 403 as a permission error without signing out', async () => {
    setApiAccessToken('valid-token');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ detail: 'Cannot update another user' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    )));

    await expect(usersApi.me()).rejects.toThrow('Cannot update another user');
    expect(authMocks.getSession).not.toHaveBeenCalled();
    expect(authMocks.signOut).not.toHaveBeenCalled();
  });

  it('refreshes the session and retries once after a 401', async () => {
    setApiAccessToken('expired-token');
    authMocks.getSession.mockResolvedValue({ accessToken: 'fresh-token' });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'user-1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(usersApi.me()).resolves.toMatchObject({ id: 'user-1' });
    expect(authMocks.getSession).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/backend/users/me',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer fresh-token' }),
      }),
    );
    expect(authMocks.signOut).not.toHaveBeenCalled();
  });

  it('signs out only after the refreshed request is still unauthorized', async () => {
    setApiAccessToken('expired-token');
    authMocks.getSession.mockResolvedValue({ accessToken: 'still-invalid' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));

    await expect(usersApi.me()).rejects.toBeInstanceOf(AuthRequiredError);
    await vi.waitFor(() => expect(authMocks.signOut).toHaveBeenCalledWith({
      callbackUrl: '/login?expired=1',
      redirect: true,
    }));
  });
});
