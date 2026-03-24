import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../../lib/supabase';

export default function TemplatesManager() {
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [repo, setRepo] = useState('');
    const [previewUrl, setPreviewUrl] = useState('');

    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [newImageFiles, setNewImageFiles] = useState<File[]>([]);

    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

    useEffect(() => {
        fetchTemplates();
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        const { data } = await supabase.from('template_categories').select('*').order('name');
        if (data) setCategories(data);
    };

    const fetchTemplates = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('templates').select('*');
        if (data) setTemplates(data);
        setLoading(false);
    };

    const handleSave = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const uploadedUrls: string[] = [];

        // Fazer upload sequencial das NOVAS imagens selecionadas
        for (const file of newImageFiles) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `covers/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('templates')
                .upload(filePath, file);

            if (uploadError) {
                alert(`Erro ao fazer upload da imagem ${file.name}: ` + uploadError.message);
                continue;
            }

            const { data } = supabase.storage.from('templates').getPublicUrl(filePath);
            uploadedUrls.push(data.publicUrl);
        }

        // Combinar Imagens já existentes (que não foram apagadas no preview) com as novas
        const finalImagesArray = [...existingImages, ...uploadedUrls];
        const primaryImageUrl = finalImagesArray.length > 0 ? finalImagesArray[0] : '';

        const payload = {
            name,
            description,
            repo,
            preview_url: previewUrl,
            image_url: primaryImageUrl,
            images: finalImagesArray,
            category_ids: selectedCategories
        };

        if (editId) {
            const { error } = await supabase
                .from('templates')
                .update(payload)
                .eq('id', editId);
            if (error) alert(error.message);
        } else {
            const { error } = await supabase
                .from('templates')
                .insert([payload]);
            if (error) alert(error.message);
        }

        closeModal();
        fetchTemplates();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Deseja excluir este template?')) return;
        const { error } = await supabase.from('templates').delete().eq('id', id);
        if (!error) {
            fetchTemplates();
        } else {
            alert('Erro ao deletar: ' + error.message);
        }
    };

    const openModal = (template?: any) => {
        setNewImageFiles([]);
        if (template) {
            setEditId(template.id);
            setName(template.name || '');
            setDescription(template.description || '');
            setRepo(template.repo || '');
            setPreviewUrl(template.preview_url || '');

            // Garantir que templates antigos que usavam field 'image_url' simples entrem pro state the array do carrosel
            const dbImages = template.images?.length > 0
                ? template.images
                : (template.image_url ? [template.image_url] : []);
            setExistingImages(dbImages);

            setSelectedCategories(template.category_ids || []);
        } else {
            setEditId(null);
            setName('');
            setDescription('');
            setRepo('');
            setPreviewUrl('');
            setExistingImages([]);
            setSelectedCategories([]);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Gerenciar Templates</h3>
                <button
                    onClick={() => openModal()}
                    className="px-4 py-2 bg-[#7c3aed] text-white text-sm font-medium rounded-md hover:bg-[#6d28d9] transition"
                >
                    Novo Template
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                        <tr>
                            <th className="px-6 py-4 font-medium">Nome</th>
                            <th className="px-6 py-4 font-medium">Descrição</th>
                            <th className="px-6 py-4 font-medium">Repositório</th>
                            <th className="px-6 py-4 font-medium text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={4} className="px-6 py-4 text-center">Carregando...</td></tr>
                        ) : templates.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-4 text-center">Nenhum template cadastrado.</td></tr>
                        ) : (
                            templates.map(t => (
                                <tr key={t.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{t.name}</td>
                                    <td className="px-6 py-4 text-gray-500 whitespace-pre-wrap">{t.description}</td>
                                    <td className="px-6 py-4 font-mono text-xs text-[#7c3aed]">{t.repo}</td>
                                    <td className="px-6 py-4 text-right space-x-3">
                                        <button
                                            onClick={() => openModal(t)}
                                            className="text-blue-600 hover:underline"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleDelete(t.id)}
                                            className="text-red-500 hover:underline"
                                        >
                                            Excluir
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
                        {/* BOTÃO FECHAR */}
                        <button onClick={closeModal} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </button>

                        <h3 className="text-xl font-bold text-gray-900 mb-6">
                            {editId ? 'Editar Template' : 'Cadastrar Template'}
                        </h3>
                        <form onSubmit={handleSave} className="space-y-5 text-left">

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Nome do Template</label>
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="Ex: Landing Page SaaS"
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#7c3aed] focus:border-[#7c3aed] sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Repositório GitHub Original</label>
                                    <input
                                        type="text"
                                        required
                                        value={repo}
                                        onChange={e => setRepo(e.target.value)}
                                        placeholder="seu_usuario/repo_template"
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm font-mono focus:ring-[#7c3aed] focus:border-[#7c3aed] sm:text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Link da Prévia ao Vivo</label>
                                <input
                                    type="url"
                                    value={previewUrl}
                                    onChange={e => setPreviewUrl(e.target.value)}
                                    placeholder="https://exemplo.com"
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#7c3aed] focus:border-[#7c3aed] sm:text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Descrição</label>
                                <textarea
                                    required
                                    rows={3}
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Descrição do site para o usuário final..."
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#7c3aed] focus:border-[#7c3aed] sm:text-sm"
                                />
                            </div>

                            <hr className="border-gray-100" />

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">Imagens do Carrossel da Vitrine</label>

                                {/* Lista de imagens atuais cadastradas */}
                                {existingImages.length > 0 && (
                                    <div className="flex flex-wrap gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                                        {existingImages.map((url, idx) => (
                                            <div key={idx} className="relative group">
                                                <img src={url} alt={`img-${idx}`} className="h-20 w-32 object-cover rounded-md border shadow-sm" />
                                                <button
                                                    type="button"
                                                    onClick={() => setExistingImages(existingImages.filter((_, i) => i !== idx))}
                                                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm shadow-md transition-transform transform scale-0 group-hover:scale-100"
                                                >×</button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Área de Drag & Drop Fake / Upload de novas fotos */}
                                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:bg-purple-50 hover:border-purple-300 transition relative">
                                    <div className="space-y-1 text-center">
                                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <div className="flex text-sm text-gray-600 justify-center">
                                            <label className="relative cursor-pointer bg-transparent rounded-md font-medium text-[#7c3aed] hover:text-[#6d28d9] hover:underline focus-within:outline-none">
                                                <span>Fazer upload de várias imagens</span>
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept="image/*"
                                                    className="sr-only"
                                                    onChange={e => {
                                                        if (e.target.files) {
                                                            setNewImageFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                                                        }
                                                    }}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                {newImageFiles.length > 0 && (
                                    <p className="text-xs text-[#7c3aed] mt-2 font-semibold">
                                        + {newImageFiles.length} imagem(ns) na fila para upload...
                                    </p>
                                )}
                            </div>

                            <hr className="border-gray-100" />

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Categorias / Tags</label>
                                {categories.length === 0 ? (
                                    <p className="text-xs text-gray-500">Nenhuma categoria cadastrada. Crie categorias primeiro no menu lateral.</p>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3 bg-gray-50">
                                        {categories.map(c => (
                                            <label key={c.id} className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCategories.includes(c.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedCategories([...selectedCategories, c.id]);
                                                        } else {
                                                            setSelectedCategories(selectedCategories.filter(id => id !== c.id));
                                                        }
                                                    }}
                                                    className="rounded border-gray-300 text-[#7c3aed] focus:ring-[#7c3aed]"
                                                />
                                                <span className="truncate">{c.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 justify-end mt-8 border-t border-gray-100 pt-6">
                                <button type="button" onClick={closeModal} className="px-6 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancelar</button>
                                <button type="submit" disabled={loading} className="px-6 py-2.5 text-sm bg-[#7c3aed] text-white rounded-lg font-bold shadow-md hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:transform-none transition">
                                    {loading ? 'Salvando...' : 'Salvar Template'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
