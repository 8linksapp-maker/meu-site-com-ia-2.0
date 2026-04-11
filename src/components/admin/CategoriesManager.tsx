import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../../lib/supabase';

export default function CategoriesManager() {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);

    const [name, setName] = useState('');

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('template_categories').select('*').order('created_at', { ascending: false });
        if (data) setCategories(data);
        setLoading(false);
    };

    const handleSave = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (editId) {
            const { error } = await supabase
                .from('template_categories')
                .update({ name })
                .eq('id', editId);
            if (error) alert(error.message);
        } else {
            const { error } = await supabase
                .from('template_categories')
                .insert([{ name }]);
            if (error) alert(error.message);
        }

        closeModal();
        fetchCategories();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Deseja realmente excluir esta categoria? Templates vinculados não poderão mais exibi-la.')) return;
        const { error } = await supabase.from('template_categories').delete().eq('id', id);
        if (!error) {
            fetchCategories();
        } else {
            alert('Erro ao deletar: ' + error.message);
        }
    };

    const openModal = (category?: any) => {
        if (category) {
            setEditId(category.id);
            setName(category.name);
        } else {
            setEditId(null);
            setName('');
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Gerenciar Categorias</h3>
                <button
                    onClick={() => openModal()}
                    className="px-4 py-2 bg-[#7c3aed] text-white text-sm font-medium rounded-md hover:bg-[#6d28d9] transition"
                >
                    Nova Categoria
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                        <tr>
                            <th className="px-6 py-4 font-medium">Nome da Categoria</th>
                            <th className="px-6 py-4 font-medium text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={2} className="px-6 py-4 text-center">Carregando...</td></tr>
                        ) : categories.length === 0 ? (
                            <tr><td colSpan={2} className="px-6 py-4 text-center">Nenhuma categoria cadastrada.</td></tr>
                        ) : (
                            categories.map(c => (
                                <tr key={c.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{c.name}</td>
                                    <td className="px-6 py-4 text-right space-x-3">
                                        <button
                                            onClick={() => openModal(c)}
                                            className="text-blue-600 hover:underline"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleDelete(c.id)}
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
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                            {editId ? 'Editar Categoria' : 'Cadastrar Categoria'}
                        </h3>
                        <form onSubmit={handleSave} className="space-y-4 text-left">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nome da Categoria</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Ex: Landing Page, Blog, Site Institucional"
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#7c3aed] focus:border-[#7c3aed] sm:text-sm"
                                />
                            </div>

                            <div className="flex gap-3 justify-end mt-6">
                                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
                                <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-[#7c3aed] text-white rounded-md font-medium disabled:opacity-50">
                                    {loading ? 'Salvando...' : 'Salvar Categoria'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
