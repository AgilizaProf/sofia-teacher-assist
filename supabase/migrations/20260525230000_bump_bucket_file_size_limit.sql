-- Permitir uploads de arquivos maiores (currículos e calendários extensos)
UPDATE storage.buckets
   SET file_size_limit = 52428800  -- 50 MB por arquivo
 WHERE id = 'documentos-professor';
