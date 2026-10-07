'use client';
import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import AccountDataPanel from './AccountDataPanel';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/utils/api';
import { normalizeName, validateName } from '@/utils/validation';
import { todayStr } from '@/utils/dateUtils';
import { useProfile, refreshProfile, isUnauthorizedError } from '@/hooks/useApi';
import { calcBmi, bmiCategory as getBmiCategory } from '@/utils/bmi';
import { User, Activity, Target, Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function Profile() {
  const router = useRouter();
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

  // Profile comes from the shared SWR cache (no extra request when another page already loaded it)
  const { profile, error: profileFetchError, isLoading: profileLoading } = useProfile();
  const loading = profileLoading && !profile;

  useEffect(() => {
    if (!profile) return;
    setFormData({
      name: profile.name || '',
      username: profile.username || '',
      email: profile.email || '',
      age: profile.age || '',
      gender: profile.gender || '',
      height: profile.height || '',
      weight: profile.weight || '',
      goal: profile.goal || ''
    });
  }, [profile]);

  useEffect(() => {
    if (!profileFetchError) return;
    if (isUnauthorizedError(profileFetchError)) {
      localStorage.removeItem('token');
      router.push('/login');
    } else {
      setMessage({ text: 'Không tải được hồ sơ. Vui lòng tải lại trang sau giây lát.', type: 'error' });
    }
  }, [profileFetchError, router]);

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
    const trimmedName = normalizeName(formData.name);
    const nameProblem = validateName(trimmedName);
    if (nameProblem) {
      setMessage({ text: nameProblem, type: 'error' });
      return;
    }

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
      const res = await apiFetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          age: formData.age ? Number(formData.age) : undefined,
          gender: formData.gender,
          height: formData.height ? Number(formData.height) : undefined,
          weight: formData.weight ? Number(formData.weight) : undefined,
          goal: formData.goal,
          metricDate: todayStr() // a changed weight is also logged as today's body measurement
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

        await refreshProfile();
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
  const bmi = calcBmi(formData.weight, formData.height);
  const { label: bmiCategory, color: bmiColor } = bmi > 0 ? getBmiCategory(bmi) : { label: '', color: '' };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-foreground font-sans">
        <Loader2 className="size-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div suppressHydrationWarning className="min-h-screen bg-background text-foreground flex font-sans overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 p-4 md:p-8 lg:p-10 space-y-8 overflow-y-auto pb-28 md:pb-10">
        <div className="max-w-[1600px] w-full mx-auto space-y-6">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground flex items-center gap-3">
              <User className="size-8 text-primary" /> Hồ sơ cá nhân
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm font-semibold mt-1">Quản lý thông tin và các chỉ số hình thể của bạn để có lộ trình tập luyện tốt nhất.</p>
          </div>
        </div>

        {message.text && (
          <div role={message.type === 'error' ? 'alert' : 'status'} className={`p-4 rounded-2xl border flex items-center gap-2 ${message.type === 'success' ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-destructive/10 border-destructive/30 text-destructive'} text-xs font-semibold`}>
            {message.type === 'success' ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} noValidate className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">

              <div>
                <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <span className="size-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center text-sm font-black">1</span>
                  Thông tin tài khoản
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:gap-6">
                  <div>
                    <label htmlFor="profile-name" className="block text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Họ và tên</label>
                    <input
                      id="profile-name"
                      type="text"
                      name="name"
                      maxLength={50}
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full bg-background border border-input rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tên đăng nhập</label>
                    <input
                      type="text"
                      value={formData.username}
                      className="w-full bg-secondary/50 border border-border/50 rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-muted-foreground cursor-not-allowed"
                      disabled
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      className="w-full bg-secondary/50 border border-border/50 rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-muted-foreground cursor-not-allowed"
                      disabled
                    />
                  </div>
                </div>
              </div>

              <div className="h-px w-full bg-border"></div>

              <div>
                <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <span className="size-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center text-sm font-black">2</span>
                  Chỉ số hình thể
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:gap-6">
                  <div>
                    <label htmlFor="profile-gender" className="block text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Giới tính</label>
                    <select
                      id="profile-gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="w-full bg-background border border-input rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                    >
                      <option value="">Chưa cập nhật</option>
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="profile-age" className="block text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tuổi</label>
                    <input
                      id="profile-age"
                      type="number"
                      name="age"
                      min="1"
                      max="120"
                      value={formData.age}
                      onChange={handleChange}
                      onKeyDown={(e) => { if (['e', 'E', '-', '+'].includes(e.key)) e.preventDefault(); }}
                      placeholder="VD: 25"
                      className="w-full bg-background border border-input rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-height" className="block text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Chiều cao (cm)</label>
                    <input
                      id="profile-height"
                      type="number"
                      name="height"
                      min="30"
                      max="300"
                      value={formData.height}
                      onChange={handleChange}
                      onKeyDown={(e) => { if (['e', 'E', '-', '+'].includes(e.key)) e.preventDefault(); }}
                      placeholder="VD: 170"
                      className="w-full bg-background border border-input rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-weight" className="block text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Cân nặng (kg)</label>
                    <input
                      id="profile-weight"
                      type="number"
                      name="weight"
                      min="10"
                      max="500"
                      value={formData.weight}
                      onChange={handleChange}
                      onKeyDown={(e) => { if (['e', 'E', '-', '+'].includes(e.key)) e.preventDefault(); }}
                      placeholder="VD: 65"
                      className="w-full bg-background border border-input rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div className="col-span-2">
                    <label htmlFor="profile-goal" className="block text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Mục tiêu tập luyện</label>
                    <select
                      id="profile-goal"
                      name="goal"
                      value={formData.goal}
                      onChange={handleChange}
                      className="w-full bg-background border border-input rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
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
                  className="px-8 py-3.5 bg-primary hover:brightness-110 text-primary-foreground font-bold text-xs rounded-full shadow-lg glow-primary transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Save className="size-4" />
                      Lưu thay đổi
                    </>
                  )}
                </button>
              </div>
            </form>
            <AccountDataPanel />
          </div>

          {/* Right Column - Stats Card */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden group hover:border-primary/30 transition-colors duration-500 sticky top-6">
              <div className="pointer-events-none absolute inset-0 bg-hero-glow opacity-50" />

              <div className="relative z-10 flex flex-col items-center">
                <div className="size-24 rounded-full bg-primary/20 p-1 mb-6 shadow-xl border border-primary/40">
                  <div className="w-full h-full bg-background rounded-full flex items-center justify-center text-4xl font-extrabold text-foreground uppercase">
                    {formData.name ? formData.name.charAt(0) : '?'}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-foreground mb-1">{formData.name || 'Người dùng'}</h3>
                <p className="text-primary text-xs font-semibold mb-8 uppercase tracking-wider">Thành viên Smart</p>

                <div className="w-full bg-background rounded-2xl p-6 border border-border">
                  <h4 className="text-muted-foreground text-xs font-semibold mb-4 uppercase tracking-wider text-center">Chỉ số BMI</h4>

                  {bmi > 0 ? (
                    <div className="flex flex-col items-center">
                      <div className={`text-5xl font-mono font-black ${bmiColor} mb-2`}>
                        {bmi.toFixed(1)}
                      </div>
                      <div className={`px-4 py-1.5 rounded-full bg-secondary text-xs font-bold ${bmiColor} border border-border`}>
                        {bmiCategory}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground text-xs">
                      Vui lòng nhập chiều cao và cân nặng để tính BMI
                    </div>
                  )}
                </div>

                {formData.goal && (
                  <div className="w-full mt-4 bg-background rounded-2xl p-5 border border-border flex items-center justify-between">
                    <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Mục tiêu</span>
                    <span className="text-primary font-bold text-sm">{formData.goal}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
);
}
