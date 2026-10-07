'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/utils/api';
import { useAdminUsers } from '@/hooks/useApi';
import { useAdmin } from '@/hooks/useAdmin';

export default function UserManagement() {
  const router = useRouter();
  const { isAdmin, checking, authError } = useAdmin();
  const { users, isLoading: usersLoading, mutate: mutateUsers } = useAdminUsers(isAdmin);
  const loading = checking || (isAdmin && usersLoading);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Success / Failure / Confirmation Popup Modal state
  const [popup, setPopup] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'confirm';
    title: string;
    message: string;
    confirmText?: string;
    onConfirm?: () => void;
  } | null>(null);

  const confirmDeleteUser = (user: any) => {
    setPopup({
      show: true,
      type: 'confirm',
      title: 'Xác Nhận Xóa Tài Khoản ⚠️',
      message: `Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản "${user.name || user.email}" khỏi hệ thống không?`,
      confirmText: 'Xóa tài khoản',
      onConfirm: () => performDeleteUser(user._id, user.name || user.email)
    });
  };

  const performDeleteUser = async (id: string, userName: string) => {
    setPopup(null);
    try {
      const res = await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedUser(null);
        mutateUsers();
        setPopup({
          show: true,
          type: 'success',
          title: 'Đã Xóa Tài Khoản! 🗑️',
          message: `Tài khoản "${userName}" đã được xóa vĩnh viễn khỏi hệ thống.`
        });
      } else {
        const error = await res.json();
        setPopup({
          show: true,
          type: 'error',
          title: 'Xóa Thất Bại ❌',
          message: error.message || 'Không thể xóa tài khoản này.'
        });
      }
    } catch (err) {
      setPopup({
        show: true,
        type: 'error',
        title: 'Lỗi Máy Chủ ❌',
        message: 'Đã xảy ra lỗi khi gửi yêu cầu xóa.'
      });
    }
  };

  const handleUpdateField = async (id: string, field: string, value: any) => {
    try {
      const res = await apiFetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [field]: value
        })
      });
      if (res.ok) {
        mutateUsers();
        setPopup({
          show: true,
          type: 'success',
          title: 'Cập Nhật Thành Công! 🎉',
          message: `Trường thông tin "${field}" của tài khoản đã được cập nhật thành công!`
        });
      } else {
        const error = await res.json();
        mutateUsers();
        setPopup({
          show: true,
          type: 'error',
          title: 'Cập Nhật Thất Bại ❌',
          message: error.message || 'Không thể cập nhật thông tin tài khoản.'
        });
      }
    } catch (err) {
      setPopup({
        show: true,
        type: 'error',
        title: 'Lỗi Máy Chủ ❌',
        message: 'Đã xảy ra lỗi khi cập nhật thông tin.'
      });
    }
  };

  const filteredUsers = users.filter(user => {
    const term = searchTerm.toLowerCase();
    return user.name?.toLowerCase().includes(term) || user.email?.toLowerCase().includes(term) || user.username?.toLowerCase().includes(term);
  });

  const openModal = (user: any) => {
    setSelectedUser(user);
  };

  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="text-6xl mb-4">⛔</div>
        <h1 className="text-2xl font-bold text-destructive mb-2">{authError}</h1>
        <button onClick={() => router.push('/')} className="mt-6 px-6 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">Về trang chủ</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col relative">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Quản lý Người dùng</h1>
        <p className="text-zinc-400 mt-2">Theo dõi và quản lý tài khoản người dùng trong hệ thống.</p>
      </div>

      <div className="bg-card/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl flex flex-col flex-1 min-h-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <h2 className="text-xl font-bold text-white">Tổng số tài khoản ({filteredUsers.length})</h2>
          
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Tìm kiếm tên, email, username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-inset border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors w-full sm:w-[300px]"
            />
          </div>
        </div>
        
        {loading ? (
          <div className="flex-1 flex justify-center items-center p-8"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar pr-2">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-zinc-900 z-10">
                <tr className="border-b border-white/10 text-zinc-400 text-sm">
                  <th className="p-4 font-medium">Người dùng</th>
                  <th className="p-4 font-medium">Vai trò</th>
                  <th className="p-4 font-medium">Trạng thái</th>
                  <th className="p-4 font-medium">Chỉ số (Cân nặng / Chiều cao)</th>
                  <th className="p-4 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr key={user._id} className="border-b border-slate-800/80 hover:bg-surface-elevated/50 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm uppercase ${user.role === 'admin' ? 'bg-destructive/20 text-destructive border border-destructive/30' : 'bg-primary/20 text-primary border border-primary/30'}`}>
                            {user.name ? user.name.charAt(0) : '?'}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{user.name}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <select 
                          value={user.role} 
                          onChange={(e) => handleUpdateField(user._id, 'role', e.target.value)}
                          className={`bg-zinc-900 border rounded-lg p-1.5 text-xs font-semibold focus:outline-none ${user.role === 'admin' ? 'border-destructive/20 text-destructive' : 'border-zinc-700 text-zinc-300'}`}
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <select 
                          value={user.isEmailVerified ? 'true' : 'false'} 
                          onChange={(e) => handleUpdateField(user._id, 'isEmailVerified', e.target.value === 'true')}
                          className={`bg-zinc-900 border rounded-lg p-1.5 text-xs font-semibold focus:outline-none ${user.isEmailVerified ? 'border-success/20 text-success' : 'border-zinc-700 text-zinc-500'}`}
                        >
                          <option value="true">Đã xác thực</option>
                          <option value="false">Chưa xác thực</option>
                        </select>
                      </td>
                      <td className="p-4 text-sm text-zinc-400">
                        {user.weight ? `${user.weight} kg` : '--'} / {user.height ? `${user.height} cm` : '--'}
                      </td>
                      <td className="p-4 text-right whitespace-nowrap flex justify-end gap-4 items-center h-full pt-6">
                        <button 
                          onClick={() => confirmDeleteUser(user)} 
                          className="text-destructive hover:text-destructive text-sm font-medium"
                        >
                          Xóa
                        </button>
                        <button 
                          onClick={() => openModal(user)} 
                          className="text-primary hover:text-primary text-sm font-medium"
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-500">
                      Không tìm thấy người dùng nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedUser(null)}></div>
          <div className="relative bg-card border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl w-full max-w-lg">
            
            <div className="flex justify-between items-start mb-6 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-2xl font-bold text-white">{selectedUser.name}</h3>
                <p className="text-slate-400 text-sm mt-1">@{selectedUser.username || 'n/a'}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-slate-500 hover:text-white transition-colors text-xl">&times;</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Profile Info */}
              <div className="space-y-4">
                <h4 className="text-destructive font-semibold mb-2">Hồ sơ cá nhân</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-zinc-500">Họ và Tên:</div>
                  <div className="text-white font-medium">{selectedUser.name}</div>
                  
                  <div className="text-zinc-500">Tên đăng nhập:</div>
                  <div className="text-white font-medium">{selectedUser.username}</div>
                  
                  <div className="text-zinc-500">Email:</div>
                  <div className="text-white font-medium truncate" title={selectedUser.email}>{selectedUser.email}</div>
                  
                  <div className="text-zinc-500">Ngày tạo:</div>
                  <div className="text-white font-medium">{new Date(selectedUser.createdAt).toLocaleDateString('vi-VN')}</div>
                </div>
              </div>

              {/* Physical Info */}
              <div className="space-y-4">
                <h4 className="text-primary font-semibold mb-2">Chỉ số Cơ thể</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-zinc-500">Tuổi:</div>
                  <div className="text-white font-medium">{selectedUser.age || '--'}</div>
                  
                  <div className="text-zinc-500">Giới tính:</div>
                  <div className="text-white font-medium">{selectedUser.gender || '--'}</div>
                  
                  <div className="text-zinc-500">Chiều cao:</div>
                  <div className="text-white font-medium">{selectedUser.height ? `${selectedUser.height} cm` : '--'}</div>
                  
                  <div className="text-zinc-500">Cân nặng:</div>
                  <div className="text-white font-medium">{selectedUser.weight ? `${selectedUser.weight} kg` : '--'}</div>
                  
                  <div className="text-zinc-500">Mục tiêu:</div>
                  <div className="text-white font-medium truncate" title={selectedUser.goal}>{selectedUser.goal || '--'}</div>
                  
                  <div className="text-zinc-500">Vận động:</div>
                  <div className="text-white font-medium truncate" title={selectedUser.activityLevel}>{selectedUser.activityLevel || '--'}</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Global Success / Error / Confirm Popup Modal */}
      {popup && popup.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-200" 
            onClick={() => popup.type !== 'confirm' && setPopup(null)}
          ></div>
          
          <div className={`relative bg-card border ${
            popup.type === 'success' 
              ? 'border-success/50 shadow-success/10' 
              : popup.type === 'error' 
                ? 'border-destructive/50 shadow-destructive/10' 
                : 'border-warning/50 shadow-warning/10'
          } rounded-3xl p-6 sm:p-8 shadow-2xl max-w-md w-full flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-200`}>
            
            {/* Icon Badge */}
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg border ${
              popup.type === 'success'
                ? 'bg-success-soft/80 text-success border-success/40 shadow-success-soft/40'
                : popup.type === 'error'
                  ? 'bg-destructive-soft/80 text-destructive border-destructive/40 shadow-destructive-soft/40'
                  : 'bg-warning-soft/80 text-warning border-warning/40 shadow-warning-soft/40'
            }`}>
              {popup.type === 'success' ? '✅' : popup.type === 'error' ? '❌' : '⚠️'}
            </div>

            {/* Title & Message */}
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white">{popup.title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">{popup.message}</p>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 w-full flex gap-3">
              {popup.type === 'confirm' ? (
                <>
                  <button
                    onClick={() => setPopup(null)}
                    className="flex-1 py-3 bg-surface-elevated hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={() => {
                      if (popup.onConfirm) popup.onConfirm();
                    }}
                    className="flex-1 py-3 bg-destructive hover:bg-destructive text-white font-black text-xs rounded-xl shadow-lg shadow-destructive-soft/40 transition active:scale-95 uppercase tracking-wider"
                  >
                    {popup.confirmText || 'Xác nhận'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setPopup(null)}
                  className={`w-full py-3 font-black text-xs rounded-xl transition shadow-lg active:scale-95 uppercase tracking-wider ${
                    popup.type === 'success'
                      ? 'bg-primary hover:bg-primary text-slate-950 shadow-primary/20'
                      : 'bg-destructive hover:bg-destructive text-white shadow-destructive/20'
                  }`}
                >
                  Đồng Ý / Đóng
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
