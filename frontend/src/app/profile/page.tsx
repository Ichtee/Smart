'use client';
import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { useRouter } from 'next/navigation';

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

        const res = await fetch('http://localhost:5000/api/users/profile', {
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
          // Token expired or invalid
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
    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/users/profile', {
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
        // Update local storage user data
        localStorage.setItem('user', JSON.stringify({
          id: data._id,
          name: data.name,
          email: data.email,
          username: data.username
        }));
        // Update token if returned
        if (data.token) {
            localStorage.setItem('token', data.token);
        }
        
        setMessage({ text: 'Cập nhật hồ sơ thành công!', type: 'success' });
      } else {
        setMessage({ text: 'Cập nhật thất bại. Vui lòng thử lại.', type: 'error' });
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
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <Header />

        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Hồ sơ cá nhân</h1>
          <p className="text-zinc-400 mt-2">Quản lý thông tin và các chỉ số hình thể của bạn để có lộ trình tập luyện tốt nhất.</p>
        </div>

        {message.text && (
          <div className={`mb-6 p-4 rounded-xl border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl">
              
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">1</span>
                  Thông tin tài khoản
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Họ và tên</label>
                    <input 
                      type="text" 
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Tên đăng nhập (Username)</label>
                    <input 
                      type="text" 
                      value={formData.username}
                      className="w-full bg-zinc-950/50 border border-zinc-800/50 rounded-xl px-4 py-3 text-zinc-500 cursor-not-allowed"
                      disabled
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Email</label>
                    <input 
                      type="email" 
                      value={formData.email}
                      className="w-full bg-zinc-950/50 border border-zinc-800/50 rounded-xl px-4 py-3 text-zinc-500 cursor-not-allowed"
                      disabled
                    />
                  </div>
                </div>
              </div>

              <div className="h-px w-full bg-white/5 mb-8"></div>

              <div className="mb-8">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center">2</span>
                  Chỉ số hình thể
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Giới tính</label>
                    <select 
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                    >
                      <option value="">Chưa cập nhật</option>
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Tuổi</label>
                    <input 
                      type="number" 
                      name="age"
                      value={formData.age}
                      onChange={handleChange}
                      placeholder="VD: 25"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Chiều cao (cm)</label>
                    <input 
                      type="number" 
                      name="height"
                      value={formData.height}
                      onChange={handleChange}
                      placeholder="VD: 170"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Cân nặng (kg)</label>
                    <input 
                      type="number" 
                      name="weight"
                      value={formData.weight}
                      onChange={handleChange}
                      placeholder="VD: 65"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Mục tiêu tập luyện</label>
                    <select 
                      name="goal"
                      value={formData.goal}
                      onChange={handleChange}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
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

              <div className="flex justify-end">
                <button 
                  type="submit" 
                  disabled={saving}
                  className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
            <div className="bg-gradient-to-b from-zinc-900/80 to-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden group hover:border-emerald-500/20 transition-colors duration-500 sticky top-6">
              <div className="absolute top-0 right-0 p-32 bg-emerald-500/10 blur-[80px] rounded-full group-hover:bg-emerald-500/20 transition-colors duration-700"></div>
              
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 p-1 mb-6 shadow-xl shadow-emerald-500/20">
                  <div className="w-full h-full bg-zinc-900 rounded-full flex items-center justify-center text-4xl font-bold text-white uppercase">
                    {formData.name ? formData.name.charAt(0) : '?'}
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-1">{formData.name || 'Người dùng'}</h3>
                <p className="text-emerald-400/80 text-sm font-medium mb-8">Thành viên MyFitness</p>

                <div className="w-full bg-black/20 rounded-2xl p-6 border border-white/5 backdrop-blur-md">
                  <h4 className="text-zinc-400 text-sm font-medium mb-4 uppercase tracking-wider text-center">Chỉ số BMI</h4>
                  
                  {bmi > 0 ? (
                    <div className="flex flex-col items-center">
                      <div className={`text-5xl font-mono font-bold ${bmiColor} mb-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]`}>
                        {bmi.toFixed(1)}
                      </div>
                      <div className={`px-4 py-1.5 rounded-full bg-zinc-800 text-sm font-bold ${bmiColor} shadow-inner`}>
                        {bmiCategory}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-zinc-500 text-sm">
                      Vui lòng nhập chiều cao và cân nặng để tính BMI
                    </div>
                  )}
                </div>

                {formData.goal && (
                  <div className="w-full mt-4 bg-black/20 rounded-2xl p-5 border border-white/5 backdrop-blur-md flex items-center justify-between">
                    <span className="text-zinc-400 text-sm">Mục tiêu</span>
                    <span className="text-cyan-400 font-bold">{formData.goal}</span>
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
