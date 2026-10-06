import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSessionId } from '../../utils/tracker';

const AdSlot = ({ placement, productId }) => {

    const [ads, setAds] = useState([]);

    useEffect(() => {
        let cancelled = false;

        const params = new URLSearchParams({ sessionId: getSessionId(), placement });
        if (productId) params.set('productId', productId);

        fetch(`/api/v1/ads?${params.toString()}`)
            .then((res) => res.json())
            .then((data) => { if (!cancelled && data.success) setAds(data.ads); })
            .catch(() => { });

        return () => { cancelled = true; };
    }, [placement, productId]);

    if (ads.length === 0) return null;

    return (
        <div className="bg-white rounded-sm shadow p-4 mt-4">
            <h3 className="text-lg font-medium mb-3">Sponsored for you</h3>
            <div className="flex flex-wrap gap-4">
                {ads.map((ad) => (
                    <Link key={ad.campaignId} to={`/product/${ad.product._id}`} className="w-48 border rounded p-3 hover:shadow">
                        <span className="text-xs text-gray-500">Sponsored</span>
                        <img draggable="false" className="h-32 w-full object-contain my-2" src={ad.product.image} alt={ad.product.name} />
                        <p className="text-sm font-medium truncate">{ad.headline}</p>
                        <p className="text-sm">₹{ad.product.price.toLocaleString()}</p>
                        <p className="text-xs text-primary-blue mt-1">{ad.reason}</p>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default AdSlot;