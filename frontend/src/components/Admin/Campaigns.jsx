import { useEffect, useState } from 'react';
import axios from 'axios';
import { useSnackbar } from 'notistack';
import MetaData from '../Layouts/MetaData';
import { categories } from '../../utils/constants';

const TRIGGERS = ['product_view', 'product_click', 'add_to_cart', 'search', 'category_visit'];
const PLACEMENTS = ['product_page', 'home'];

const emptyForm = {
    name: '', product: '', headline: '',
    categories: [], subcategories: '', tags: '',
    minPrice: '', maxPrice: '',
    triggerEvents: ['product_view'], placements: ['product_page'],
    bid: 1, dailyBudget: '',
};

const errorMessage = (err) => err.response?.data?.message || err.message;

const Campaigns = () => {

    const { enqueueSnackbar } = useSnackbar();
    const [campaigns, setCampaigns] = useState([]);
    const [products, setProducts] = useState([]);
    const [form, setForm] = useState(emptyForm);

    const load = async () => {
        try {
            const [c, p] = await Promise.all([
                axios.get('/api/v1/admin/campaigns'),
                axios.get('/api/v1/admin/products'),
            ]);
            setCampaigns(c.data.campaigns);
            setProducts(p.data.products);
        } catch (err) {
            enqueueSnackbar(errorMessage(err), { variant: 'error' });
        }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { load(); }, []);

    const setField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

    // add or remove a value in a list of checkboxes
    const toggle = (field, value) => setForm((f) => ({
        ...f,
        [field]: f[field].includes(value) ? f[field].filter((v) => v !== value) : [...f[field], value],
    }));

    const submit = async (e) => {
        e.preventDefault();
        if (!form.product) {
            enqueueSnackbar('Choose the product to promote', { variant: 'warning' });
            return;
        }
        try {
            await axios.post('/api/v1/admin/campaigns', {
                name: form.name,
                product: form.product,
                headline: form.headline,
                targeting: {
                    categories: form.categories,
                    subcategories: form.subcategories,
                    tags: form.tags,
                    minPrice: form.minPrice,
                    maxPrice: form.maxPrice,
                    triggerEvents: form.triggerEvents,
                },
                placements: form.placements,
                bid: form.bid,
                dailyBudget: form.dailyBudget,
            });
            enqueueSnackbar('Campaign created', { variant: 'success' });
            setForm(emptyForm);
            load();
        } catch (err) {
            enqueueSnackbar(errorMessage(err), { variant: 'error' });
        }
    };

    const changeStatus = async (c) => {
        try {
            await axios.put(`/api/v1/admin/campaign/${c._id}`, { status: c.status === 'active' ? 'paused' : 'active' });
            load();
        } catch (err) {
            enqueueSnackbar(errorMessage(err), { variant: 'error' });
        }
    };

    const remove = async (id) => {
        try {
            await axios.delete(`/api/v1/admin/campaign/${id}`);
            load();
        } catch (err) {
            enqueueSnackbar(errorMessage(err), { variant: 'error' });
        }
    };

    const checkbox = (field, value) => (
        <label key={value} className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={form[field].includes(value)} onChange={() => toggle(field, value)} />
            {value}
        </label>
    );

    const input = "border rounded px-2 py-1.5 text-sm w-full";

    return (
        <>
            <MetaData title="Admin: Campaigns | Flipkart" />

            <form onSubmit={submit} className="flex flex-col gap-4 bg-white rounded-sm shadow p-4">
                <h2 className="text-lg font-medium">New Campaign</h2>

                <input className={input} placeholder="Campaign name (e.g. Gaming Laptop Promotion)" required
                    value={form.name} onChange={(e) => setField('name', e.target.value)} />

                <select className={input} value={form.product} onChange={(e) => setField('product', e.target.value)}>
                    <option value="">Product to promote...</option>
                    {products.map((p) => <option key={p._id} value={p._id}>{p.name} (₹{p.price})</option>)}
                </select>

                <input className={input} placeholder="Headline (optional, defaults to product name)" maxLength={80}
                    value={form.headline} onChange={(e) => setField('headline', e.target.value)} />

                <div>
                    <p className="text-sm font-medium mb-1">Target shoppers viewing these categories (empty = any)</p>
                    <div className="flex flex-wrap gap-4">{categories.map((c) => checkbox('categories', c))}</div>
                </div>

                <div className="flex gap-3">
                    <input className={input} placeholder="Subcategories (comma separated)"
                        value={form.subcategories} onChange={(e) => setField('subcategories', e.target.value)} />
                    <input className={input} placeholder="Tags (comma separated)"
                        value={form.tags} onChange={(e) => setField('tags', e.target.value)} />
                </div>

                <div className="flex gap-3">
                    <input className={input} type="number" min="0" placeholder="Min price of viewed product"
                        value={form.minPrice} onChange={(e) => setField('minPrice', e.target.value)} />
                    <input className={input} type="number" min="0" placeholder="Max price of viewed product"
                        value={form.maxPrice} onChange={(e) => setField('maxPrice', e.target.value)} />
                </div>

                <div>
                    <p className="text-sm font-medium mb-1">Target event (what the shopper did)</p>
                    <div className="flex flex-wrap gap-4">{TRIGGERS.map((t) => checkbox('triggerEvents', t))}</div>
                </div>

                <div>
                    <p className="text-sm font-medium mb-1">Where to show the ad</p>
                    <div className="flex flex-wrap gap-4">{PLACEMENTS.map((p) => checkbox('placements', p))}</div>
                </div>

                <div className="flex gap-3">
                    <input className={input} type="number" min="0" step="0.1" placeholder="Bid per click (₹)"
                        value={form.bid} onChange={(e) => setField('bid', e.target.value)} />
                    <input className={input} type="number" min="0" placeholder="Daily budget (₹, empty = no limit)"
                        value={form.dailyBudget} onChange={(e) => setField('dailyBudget', e.target.value)} />
                </div>

                <button type="submit" className="bg-primary-blue text-white font-medium py-2 rounded shadow">Create Campaign</button>
            </form>

            <div className="bg-white rounded-sm shadow p-4 overflow-x-auto">
                <h2 className="text-lg font-medium mb-3">All Campaigns</h2>
                <table className="w-full text-sm text-left">
                    <thead>
                        <tr className="border-b">
                            <th className="py-2">Name</th>
                            <th>Promoted product</th>
                            <th>Targeting</th>
                            <th>Bid</th>
                            <th>Status</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {campaigns.map((c) => (
                            <tr key={c._id} className="border-b align-top">
                                <td className="py-2">{c.name}</td>
                                <td>{c.product ? c.product.name : 'Deleted product'}</td>
                                <td className="text-xs text-gray-600">
                                    {c.targeting.categories.join(', ') || 'any category'} /{' '}
                                    {c.targeting.subcategories.join(', ') || 'any subcategory'} /{' '}
                                    ₹{c.targeting.minPrice} to ₹{c.targeting.maxPrice} /{' '}
                                    {c.targeting.triggerEvents.join(', ') || 'any event'}
                                </td>
                                <td>₹{c.bid}</td>
                                <td className={c.status === 'active' ? 'text-primary-green' : 'text-gray-500'}>{c.status}</td>
                                <td className="whitespace-nowrap">
                                    <button onClick={() => changeStatus(c)} className="text-primary-blue mr-3">
                                        {c.status === 'active' ? 'Pause' : 'Activate'}
                                    </button>
                                    <button onClick={() => remove(c._id)} className="text-red-600">Delete</button>
                                </td>
                            </tr>
                        ))}
                        {campaigns.length === 0 && (
                            <tr><td colSpan="6" className="py-4 text-gray-500">No campaigns yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
};

export default Campaigns;