-- Comprehensive Key Generation Verification Script
-- This script checks if new keys are being saved correctly after migration

-- 1. Check current state of all keys
SELECT 
    'Current Keys Overview' as test_section,
    COUNT(*) as total_keys,
    COUNT(encrypted_private_key) as encrypted_keys,
    COUNT(*) FILTER (WHERE encrypted_private_key IS NULL) as unencrypted_keys,
    ROUND(COUNT(encrypted_private_key)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as encryption_percentage
FROM key_pairs;

-- 2. List all keys with their encryption status
SELECT 
    'Key Details' as test_section,
    id,
    user_id,
    LEFT(public_key, 50) || '...' as public_key_preview,
    CASE 
        WHEN encrypted_private_key IS NOT NULL THEN 'ENCRYPTED'
        ELSE 'UNENCRYPTED'
    END as encryption_status,
    encryption_algorithm,
    key_version,
    created_at
FROM key_pairs
ORDER BY created_at DESC;

-- 3. Check if users have keys
SELECT 
    'Users with Keys' as test_section,
    u.id as user_id,
    u.email,
    u.nome_completo,
    COUNT(kp.id) as key_count,
    MAX(kp.created_at) as latest_key_created
FROM users u
LEFT JOIN key_pairs kp ON u.id = kp.user_id
GROUP BY u.id, u.email, u.nome_completo
ORDER BY u.created_at DESC;

-- 4. Verify RLS policies are working
SELECT 
    'RLS Policies for key_pairs' as test_section,
    policyname,
    cmd,
    qual as using_condition,
    with_check as check_condition
FROM pg_policies
WHERE tablename = 'key_pairs'
ORDER BY cmd, policyname;

-- 5. Check for duplicate policies (these should be cleaned up)
SELECT 
    'Duplicate Policies Check' as test_section,
    cmd,
    COUNT(*) as policy_count,
    STRING_AGG(policyname, ', ') as policy_names
FROM pg_policies
WHERE tablename = 'key_pairs'
GROUP BY cmd
HAVING COUNT(*) > 1;

-- 6. Test query to simulate what happens when a user tries to read their keys
-- Replace 'USER_UUID_HERE' with actual user UUID to test
SELECT 
    'Simulated User Query Test' as test_section,
    'Replace USER_UUID_HERE with actual UUID to test' as instruction;

-- Example test query (commented out - replace UUID and uncomment to test):
-- SELECT * FROM key_pairs WHERE user_id = 'c4439af1-9115-4452-828d-5db235af1483';

-- 7. Check table structure
SELECT 
    'Table Structure' as test_section,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'key_pairs'
ORDER BY ordinal_position;