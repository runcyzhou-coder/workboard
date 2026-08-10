-- Supabase Auth 邮箱域名白名单配置
-- 在 Supabase Dashboard → SQL Editor 中运行此脚本
--
-- 功能：在数据库层强制只允许 @kiki-tech.com 邮箱注册和登录
-- 即使前端校验被绕过，数据库触发器也会阻止非白名单邮箱

-- 1. 创建邮箱域名校验函数
CREATE OR REPLACE FUNCTION public.check_email_domain()
RETURNS TRIGGER AS $$
BEGIN
  -- 只允许 @kiki-tech.com 后缀的邮箱
  IF NEW.email NOT LIKE '%@kiki-tech.com' THEN
    RAISE EXCEPTION '非 KikiTech 内部员工，拒绝访问。仅允许 @kiki-tech.com 邮箱注册。';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 在 auth.users 表上创建触发器（注册时校验）
DROP TRIGGER IF EXISTS enforce_email_domain_whitelist ON auth.users;
CREATE TRIGGER enforce_email_domain_whitelist
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.check_email_domain();

-- 3. 额外安全：在用户注册时也校验（防止通过 API 绕过）
-- 此函数在注册流程中被调用
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email NOT LIKE '%@kiki-tech.com' THEN
    RAISE EXCEPTION '非 KikiTech 内部员工，拒绝访问';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_domain_check ON auth.users;
CREATE TRIGGER on_auth_user_created_domain_check
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 说明：
-- 配置完成后，需要在 Supabase Dashboard 中做以下设置：
--
-- 1. Authentication → Settings →：
--    - 关闭 "Allow new users to sign up"（改为 invite-only 或保持开启但依赖触发器校验）
--    - 或保持开启，触发器会自动拦截非 @kiki-tech.com 邮箱
--
-- 2. 如需手动邀请员工：
--    - Authentication → Users → Add user → 填入 xxx@kiki-tech.com 邮箱和密码
--    - 员工可直接用该账号登录
--
-- 3. Site URL 设置（用于邮件验证链接重定向）：
--    - Authentication → Settings → Site URL
--    - 填入你的线上地址，如 https://app.kiki-tech.com
