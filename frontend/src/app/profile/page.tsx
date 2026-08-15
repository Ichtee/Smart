'use client';
import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/utils/api';

export default function Profile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    age: '',
    gender: '',
    height: '',
    weight: '',
    goal: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const res = await fetch(`${API_URL}/api/users/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          setFormData({
            name: data.name || '',
            username: data.username || '',
            email: data.email || '',
            age: data.age || '',
            gender: data.gender || '',
            height: data.height || '',
            weight: data.weight || '',
            goal: data.goal || ''
          });
        } else {
          localStorage.removeItem('token');
          router.push('/login');
        }
      } catch (err) {
        console.error('Failed to fetch profile', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    // Business Logic Validations
    if (formData.age) {
      const ageNum = Number(formData.age);
      if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
        setMessage({ text: 'Tuổi phải là số dương hợp lệ (từ 1 đến 120 tuổi)!', type: 'error' });
        return;
      }
    }

    if (formData.height) {
      const heightNum = Number(formData.height);
      if (isNaN(heightNum) || heightNum < 30 || heightNum > 300) {
        setMessage({ text: 'Chiều cao phải là số dương hợp lệ (từ 30cm đến 300cm)!', type: 'error' });
        return;
      }
    }

    if (formData.weight) {
      const weightNum = Number(formData.weight);
      if (isNaN(weightNum) || weightNum < 10 || weightNum > 500) {
        setMessage({ text: 'Cân nặng phải là số dương hợp lệ (từ 10kg đến 500kg)!', type: 'error' });
        return;
      }
    }

    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          age: formData.age ? Number(formData.age) : undefined,
          gender: formData.gender,
          height: formData.height ? Number(formData.height) : undefined,
          weight: formData.weight ? Number(formData.weight) : undefined,
          goal: formData.goal
        })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('user', JSON.stringify({
          id: data._id,
          name: data.name,
          email: data.email,
          username: data.username
        }));
        if (data.token) {
          localStorage.setItem('token', data.token);
        }

        setMessage({ text: 'Cập nhật hồ sơ thành công!', type: 'success' });
      } else {
        const errData = await res.json().catch(() => ({}));
        setMessage({ text: errData.message || 'Cập nhật thất bại. Vui lòng kiểm tra dữ liệu nhập.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Đã xảy ra lỗi kết nối.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Calculate BMI
  let bmi = 0;
  let bmiCategory = '';
  let bmiColor = '';

  if (formData.height && formData.weight) {
    const heightInMeters = Number(formData.height) / 100;
    bmi = Number(formData.weight) / (heightInMeters * heightInMeters);

    if (bmi < 18.5) {
      bmiCategory = 'Thiếu cân';
      bmiColor = 'text-blue-400';
    } else if (bmi >= 18.5 && bmi < 24.9) {
      bmiCategory = 'Bình thường';
      bmiColor = 'text-emerald-400';
    } else if (bmi >= 25 && bmi < 29.9) {
      bmiCategory = 'Thừa cân';
      bmiColor = 'text-yellow-400';
    } else {
      bmiCategory = 'Béo phì';
      bmiColor = 'text-red-400';
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div suppressHydrationWarning className="min-h-screen bg-[#0B0F19] text-white p-4 md:p-8 relative overflow-hidden font-sans">
      {/* Background glow effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-cyan-500/10 blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10 space-y-6">
        <Header />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <span className="text-[#00E5FF]">👤</span> Hồ sơ cá nhân
            </h1>
            <p className="text-slate-400 text-xs font-semibold mt-1">Quản lý thông tin và các chỉ số hình thể của bạn để có lộ trình tập luyện tốt nhất.</p>
          </div>
        </div>

        {message.text && (
          <div className={`p-4 rounded-2xl border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'} text-xs font-bold`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">

              <div>
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-black">1</span>
                  Thông tin tài khoản
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Họ và tên</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full bg-[#0B101D] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tên đăng nhập (Username)</label>
                    <input
                      type="text"
                      value={formData.username}
                      className="w-full bg-[#0B101D]/50 border border-slate-800/50 rounded-xl px-4 py-3 text-sm text-slate-500 cursor-not-allowed"
                      disabled
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      className="w-full bg-[#0B101D]/50 border border-slate-800/50 rounded-xl px-4 py-3 text-sm text-slate-500 cursor-not-allowed"
                      disabled
                    />
                  </div>
                </div>
              </div>

              <div className="h-px w-full bg-slate-800/80"></div>

              <div>
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-black">2</span>
                  Chỉ số hình thể
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Giới tính</label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="w-full bg-[#0B101D] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    >
                      <option value="">Chưa cập nhật</option>
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tuổi</label>
                    <input
                      type="number"
                      name="age"
                      min="1"
                      max="120"
                      value={formData.age}
                      onChange={handleChange}
                      placeholder="VD: 25"
                      className="w-full bg-[#0B101D] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Chiều cao (cm)</label>
                    <input
                      type="number"
                      name="height"
                      min="30"
                      max="300"
                      value={formData.height}
                      onChange={handleChange}
                      placeholder="VD: 170"
                      className="w-full bg-[#0B101D] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cân nặng (kg)</label>
                    <input
                      type="number"
                      name="weight"
                      min="10"
                      max="500"
                      value={formData.weight}
                      onChange={handleChange}
                      placeholder="VD: 65"
                      className="w-full bg-[#0B101D] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Mục tiêu tập luyện</label>
                    <select
                      name="goal"
                      value={formData.goal}
                      onChange={handleChange}
                      className="w-full bg-[#0B101D] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    >
                      <option value="">Chưa cập nhật</option>
                      <option value="Tăng cơ">Tăng cơ (Muscle Gain)</option>
                      <option value="Giảm mỡ">Giảm mỡ (Fat Loss)</option>
                      <option value="Tăng cân">Tăng cân (Weight Gain)</option>
                      <option value="Giữ dáng">Giữ dáng (Maintenance)</option>
                      <option value="Sức bền">Sức bền (Endurance)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-8 py-3 bg-[#00E5FF] hover:bg-cyan-300 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-[#00E5FF]/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                      Đang lưu...
                    </>
                  ) : (
                    'Lưu thay đổi'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column - Stats Card */}
          <div className="lg:col-span-1">
            <div className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden group hover:border-emerald-500/20 transition-colors duration-500 sticky top-6">
              <div className="absolute top-0 right-0 p-32 bg-emerald-500/10 blur-[80px] rounded-full group-hover:bg-emerald-500/20 transition-colors duration-700"></div>

              <div className="relative z-10 flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 p-1 mb-6 shadow-xl shadow-emerald-500/20">
                  <div className="w-full h-full bg-[#0B0F19] rounded-full flex items-center justify-center text-4xl font-extrabold text-white uppercase">
                    {formData.name ? formData.name.charAt(0) : '?'}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white mb-1">{formData.name || 'Người dùng'}</h3>
                <p className="text-[#00E5FF]/80 text-xs font-bold mb-8 uppercase tracking-wider">Thành viên Smart</p>

                <div className="w-full bg-[#0B101D] rounded-2xl p-6 border border-slate-800">
                  <h4 className="text-slate-400 text-xs font-bold mb-4 uppercase tracking-wider text-center">Chỉ số BMI</h4>

                  {bmi > 0 ? (
                    <div className="flex flex-col items-center">
                      <div className={`text-5xl font-mono font-black ${bmiColor} mb-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]`}>
                        {bmi.toFixed(1)}
                      </div>
                      <div className={`px-4 py-1.5 rounded-full bg-[#18233C] text-xs font-extrabold ${bmiColor} border border-slate-800`}>
                        {bmiCategory}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-slate-500 text-xs">
                      Vui lòng nhập chiều cao và cân nặng để tính BMI
                    </div>
                  )}
                </div>

                {formData.goal && (
                  <div className="w-full mt-4 bg-[#0B101D] rounded-2xl p-5 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Mục tiêu</span>
                    <span className="text-[#00E5FF] font-extrabold text-sm">{formData.goal}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
