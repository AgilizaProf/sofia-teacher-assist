DROP POLICY IF EXISTS "Authenticated can select documentos-professor" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can insert documentos-professor" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update documentos-professor" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete documentos-professor" ON storage.objects;

CREATE POLICY "Users can select own documentos-professor"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documentos-professor'
  AND (
    name = 'calendario-' || auth.uid()::text || '.pdf'
    OR name LIKE 'curriculo-' || auth.uid()::text || '-%'
  )
);

CREATE POLICY "Users can insert own documentos-professor"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documentos-professor'
  AND (
    name = 'calendario-' || auth.uid()::text || '.pdf'
    OR name LIKE 'curriculo-' || auth.uid()::text || '-%'
  )
);

CREATE POLICY "Users can update own documentos-professor"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documentos-professor'
  AND (
    name = 'calendario-' || auth.uid()::text || '.pdf'
    OR name LIKE 'curriculo-' || auth.uid()::text || '-%'
  )
)
WITH CHECK (
  bucket_id = 'documentos-professor'
  AND (
    name = 'calendario-' || auth.uid()::text || '.pdf'
    OR name LIKE 'curriculo-' || auth.uid()::text || '-%'
  )
);

CREATE POLICY "Users can delete own documentos-professor"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documentos-professor'
  AND (
    name = 'calendario-' || auth.uid()::text || '.pdf'
    OR name LIKE 'curriculo-' || auth.uid()::text || '-%'
  )
);