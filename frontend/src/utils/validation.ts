// Client-side input rules for sign-up. They mirror the backend (controllers/userController.js), which
// stays the authority; these only give instant feedback. Each returns an error message or null.

export const normalizeName = (name: string): string => name.trim().replace(/\s+/g, ' ');

export function validateName(name: string): string | null {
  const n = normalizeName(name);
  if (n.length < 2 || n.length > 50) {
    return 'Họ và tên không được chứa toàn khoảng trắng, độ dài từ 2 đến 50 ký tự.';
  }
  return null;
}

export function validateUsername(username: string): string | null {
  const u = username.trim();
  if (/\s/.test(u) || u.length < 3 || u.length > 30) {
    return 'Tên đăng nhập không được chứa khoảng trắng, độ dài từ 3 đến 30 ký tự.';
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(u)) {
    return 'Tên đăng nhập chỉ được chứa chữ cái, chữ số, gạch dưới (_) và gạch nối (-).';
  }
  return null;
}

export function validateEmail(email: string): string | null {
  const e = email.trim();
  if (/\s/.test(e) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || e.length > 100) {
    return 'Email không được chứa dấu cách và phải đúng định dạng (VD: user@example.com).';
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Vui lòng nhập mật khẩu.';
  if (password !== password.trim()) return 'Mật khẩu không được chứa khoảng trắng ở đầu hoặc cuối.';
  if (password.length < 8 || password.length > 100) return 'Mật khẩu phải từ 8 đến 100 ký tự.';
  return null;
}

/** Password + confirmation, as asked on the "set your password" step. */
export function validateNewPassword(password: string, confirm: string): string | null {
  return validatePassword(password) ?? (password !== confirm ? 'Mật khẩu nhập lại không khớp.' : null);
}
