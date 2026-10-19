'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import AccountDataPanel from './AccountDataPanel';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/utils/api';
import { normalizeName, validateName } from '@/utils/validation';
import { todayStr } from '@/utils/dateUtils';
import { useProfile, refreshProfile, isUnauthorizedError } from '@/hooks/useApi';
import { calcBmi, bmiCategory as getBmiCategory } from '@/utils/bmi';
import { goalHasPace } from '@/utils/nutritionCalc';
import GoalPlanFields, { goalPlanError } from '@/components/GoalPlanFields';
import Link from 'next/link';
import { User, Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

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
    goal: '',
    goalPace: 'Vừa',
    targetWeight: ''
  });

  // Profile comes from the shared SWR cache (no extra request when another page already loaded it)
  const { profile, error: profileFetchError, isLoading: profileLoading } = useProfile();
  const loading = profileLoading && !profile;

  // Fill the form whenever the loaded profile changes (SWR keeps the same object while the data is unchanged,
  // so typing is never overwritten by a background refresh)
  const [syncedProfile, setSyncedProfile] = useState<typeof profile>(undefined);
  if (profile && profile !== syncedProfile) {
    setSyncedProfile(profile);
    setFormData({
      name: profile.name || '',
      username: profile.username || '',
      email: profile.email || '',
      age: profile.age || '',
      gender: profile.gender || '',
      height: profile.height || '',
      weight: profile.weight || '',
      goal: profile.goal || '',
      goalPace: profile.goalPace || 'Vừa',
      targetWeight: profile.targetWeight != null ? String(profile.targetWeight) : ''
    });
  }

  // one notice per failed load; a 401 is handled by the redirect below instead
  const [reportedError, setReportedError] = useState<unknown>(null);
  if (profileFetchError && profileFetchError !== reportedError && !isUnauthorizedError(profileFetchError)) {
    setReportedError(profileFetchError);
    setMessage({ text: 'Không tải được hồ sơ. Vui lòng tải lại trang sau giây lát.', type: 'error' });
  }

  useEffect(() => {
    if (!isUnauthorizedError(profileFetchError)) return;
    localStorage.removeItem('token');
    router.push('/login');
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

    const goalProblem = goalPlanError(formData, formData);
    if (goalProblem) {
      setMessage({ text: goalProblem, type: 'error' });
      return;
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
          goalPace: formData.goalPace,
          // a maintenance goal has no target weight
          targetWeight: goalHasPace(formData.goal) && String(formData.targetWeight).trim() !== '' ? Number(formData.targetWeight) : null,
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
    } catch {
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
    <AppShell
      title="Hồ sơ"
      icon={<User className="size-6 text-primary" />}
      subtitle="Quản lý thông tin và các chỉ số hình thể của bạn để có lộ trình tập luyện tốt nhất."
    >
        {message.text && (
          <div role={message.type === 'error' ? 'alert' : 'status'} className={`p-4 rounded-2xl border flex items-center gap-2 ${message.type === 'success' ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-destructive/10 border-destructive/30 text-destructive'} text-xs font-semibold`}>
            {message.type === 'success' ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 xl:min-h-[34rem] xl:flex-1 xl:grid-cols-12">
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 xl:contents">
            <div className="bg-card border border-border rounded-3xl p-4 sm:p-5 space-y-4 xl:col-span-4 xl:min-h-0 xl:overflow-y-auto">
              <div>
                <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <span className="size-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center text-sm font-black">1</span>
                  Thông tin tài khoản
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:gap-6">
                  <div>
                    <label htmlFor="profile-name" className="block text-xs sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Họ và tên</label>
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
                    <label className="block text-xs sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tên đăng nhập</label>
                    <input
                      type="text"
                      value={formData.username}
                      className="w-full bg-secondary/50 border border-border/50 rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-muted-foreground cursor-not-allowed"
                      disabled
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Email</label>
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
                    <label htmlFor="profile-gender" className="block text-xs sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Giới tính</label>
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
                    <label htmlFor="profile-age" className="block text-xs sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tuổi</label>
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
                    <label htmlFor="profile-height" className="block text-xs sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Chiều cao (cm)</label>
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
                    <label htmlFor="profile-weight" className="block text-xs sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Cân nặng (kg)</label>
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
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-3xl p-4 sm:p-5 space-y-4 xl:col-span-4 xl:min-h-0 xl:overflow-y-auto">
              <div>
                    <GoalPlanFields
                      idPrefix="profile"
                      goalLabel="Mục tiêu tập luyện"
                      allowEmpty
                      value={{ goal: formData.goal, goalPace: formData.goalPace, targetWeight: String(formData.targetWeight) }}
                      onChange={v => setFormData({ ...formData, ...v })}
                      profile={{ ...formData, activityLevel: profile?.activityLevel, bodyFat: profile?.bodyFat }}
                      labelClassName="block text-xs sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2"
                      selectClassName="w-full bg-background border border-input rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                      inputClassName="w-full bg-background border border-input rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                    />
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
            </div>
          </form>
          <div className="flex flex-col gap-4 xl:col-span-4 xl:min-h-0 xl:overflow-y-auto">
            <div className="bg-card border border-border rounded-3xl p-4 sm:p-5 relative overflow-hidden group hover:border-primary/30 transition-colors duration-500 sticky top-6">
              <div className="pointer-events-none absolute inset-0 bg-hero-glow opacity-50" />

              <div className="relative z-10 flex flex-col items-center">
                <div className="size-16 rounded-full bg-primary/20 p-1 mb-3 shadow-xl border border-primary/40">
                  <div className="w-full h-full bg-background rounded-full flex items-center justify-center text-2xl font-extrabold text-foreground uppercase">
                    {formData.name ? formData.name.charAt(0) : '?'}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-foreground mb-1">{formData.name || 'Người dùng'}</h3>
                <p className="text-primary text-xs font-semibold mb-4 uppercase tracking-wider">Thành viên Smart</p>

                <div className="w-full bg-background rounded-2xl p-4 border border-border">
                  <h4 className="text-muted-foreground text-xs font-semibold mb-4 uppercase tracking-wider text-center">Chỉ số BMI</h4>

                  {bmi > 0 ? (
                    <div className="flex flex-col items-center">
                      <div className={`text-4xl font-mono font-black ${bmiColor} mb-2`}>
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
                  <div className="w-full mt-3 bg-background rounded-2xl p-3 border border-border flex items-center justify-between">
                    <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Mục tiêu</span>
                    <span className="text-primary font-bold text-sm">{formData.goal}{goalHasPace(formData.goal) ? ` · ${formData.goalPace}` : ''}</span>
                  </div>
                )}

                <div className="w-full mt-3 bg-background rounded-2xl p-3 border border-border flex items-center justify-between gap-3" data-testid="profile-bodyfat">
                  <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Tỷ lệ mỡ</span>
                  {profile?.bodyFat != null ? (
                    <span className="font-bold text-sm">{profile.bodyFat}%</span>
                  ) : (
                    <Link href="/body" className="inline-block py-2 -my-2 text-primary text-xs font-bold hover:underline">Nhập ở trang Cơ thể</Link>
                  )}
                </div>
              </div>
            </div>
            <AccountDataPanel />
          </div>
        </div>
    </AppShell>
  );
}
