export function TopBrands({ brands }) {
  if (!brands?.length) return null;

  return (
    <div className="top-brands">
      <h3>Топ марок</h3>
      {brands.map((brand, i) => (
        <div key={brand.name} className="brand-row">
          <span>
            {i + 1}. {brand.name}
          </span>
          <span>
            {brand.count} ({(brand.share * 100).toFixed(0)}%)
          </span>
        </div>
      ))}
    </div>
  );
}
