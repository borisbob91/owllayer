import type { IncomingMessage, ServerResponse } from 'http';
import bcrypt from 'bcrypt';
import { parseBody, json, authenticate, type CloudDeps } from './utils.js';
import type { AuditService } from '../audit/AuditService.js';

export async function handleAuth(
  req: IncomingMessage,
  res: ServerResponse,
  segments: string[],
  deps: CloudDeps & { audit: AuditService },
): Promise<boolean> {
  const { prisma, jwt, audit } = deps;

  // POST /api/auth/login
  if (segments[1] === 'login' && req.method === 'POST') {
    const body = await parseBody<{ email: string; password: string }>(req);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) {
      json(res, 401, { error: 'Invalid credentials' });
      return true;
    }
    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      json(res, 401, { error: 'Invalid credentials' });
      return true;
    }
    // Get first org membership for orgId + role
    const membership = await prisma.orgMember.findFirst({
      where: { userId: user.id },
      include: { org: true },
    });
    const token = jwt.sign({
      sub: user.id,
      email: user.email,
      orgId: membership?.orgId ?? '',
      role: membership?.role ?? 'VIEWER',
    });
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await audit.log({ userId: user.id, orgId: membership?.orgId, action: 'user.login', ip: req.socket.remoteAddress });
    json(res, 200, { token });
    return true;
  }

  // POST /api/auth/register
  if (segments[1] === 'register' && req.method === 'POST') {
    const body = await parseBody<{ email: string; password: string; name?: string }>(req);
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      json(res, 409, { error: 'Email already registered' });
      return true;
    }
    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: { email: body.email, name: body.name, passwordHash },
    });
    const token = jwt.sign({ sub: user.id, email: user.email, orgId: '', role: 'VIEWER' });
    json(res, 201, { token });
    return true;
  }

  // POST /api/auth/refresh
  if (segments[1] === 'refresh' && req.method === 'POST') {
    const payload = authenticate(req, jwt);
    const newToken = jwt.sign({
      sub: payload.sub,
      email: payload.email,
      orgId: payload.orgId,
      role: payload.role,
    });
    json(res, 200, { token: newToken });
    return true;
  }

  return false;
}
