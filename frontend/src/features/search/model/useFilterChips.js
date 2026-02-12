import { useState, useMemo, useEffect } from "react";

const FILTER_GROUPS = [
  { key: "engine_type", label: "Двигатель" },
  { key: "transmission", label: "КПП" },
  { key: "drive_type", label: "Привод" },
  { key: "body_type", label: "Кузов" },
  { key: "year", label: "Год" },
];

export function useFilterChips(cars = []) {
  const [activeFilters, setActiveFilters] = useState({});
  // Reset filters when cars becomes empty (new search sets result=null → cars=[])
  // loadMore only grows the array, never empties it — so filters persist
  useEffect(() => {
    if (cars.length === 0) {
      setActiveFilters({});
    }
  }, [cars]);

  const toggleFilter = (groupKey, value) => {
    setActiveFilters((prev) => {
      const current = prev[groupKey] || [];
      const exists = current.includes(value);
      const updated = exists
        ? current.filter((v) => v !== value)
        : [...current, value];
      if (updated.length === 0) {
        const { [groupKey]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [groupKey]: updated };
    });
  };

  const resetFilters = () => setActiveFilters({});

  const hasActiveFilters = Object.keys(activeFilters).length > 0;

  // Filter cars: AND between groups, OR within group, null values always pass (FR-011)
  const filteredCars = useMemo(() => {
    if (!hasActiveFilters) return cars;
    const activeGroupKeys = Object.keys(activeFilters);
    return cars.filter((car) =>
      activeGroupKeys.every((groupKey) => {
        const val = car[groupKey];
        if (val == null || val === "") return true; // FR-011: always pass
        return activeFilters[groupKey].includes(String(val));
      })
    );
  }, [cars, activeFilters, hasActiveFilters]);

  // Generate chip groups with faceted counts (Decision 4: counts exclude current group)
  const chipGroups = useMemo(() => {
    if (cars.length <= 1) return [];

    const activeGroupKeys = Object.keys(activeFilters);

    return FILTER_GROUPS.map((group) => {
      // Collect unique non-null values for this group
      const uniqueValues = [
        ...new Set(
          cars
            .map((car) => car[group.key])
            .filter((v) => v != null && v !== "")
            .map(String)
        ),
      ];

      // Skip group if only 1 unique value (nothing to filter)
      if (uniqueValues.length <= 1) return null;

      // Compute base set: cars filtered by all OTHER groups (not current)
      const otherGroupKeys = activeGroupKeys.filter((k) => k !== group.key);
      const baseForCounts =
        otherGroupKeys.length === 0
          ? cars
          : cars.filter((car) =>
              otherGroupKeys.every((gk) => {
                const val = car[gk];
                if (val == null || val === "") return true;
                return activeFilters[gk].includes(String(val));
              })
            );

      // Count occurrences of each value in the base set
      const values = uniqueValues
        .map((value) => {
          const count = baseForCounts.filter((car) => {
            const val = car[group.key];
            return val != null && val !== "" && String(val) === value;
          }).length;
          const isActive = (activeFilters[group.key] || []).includes(value);
          return { value, count, isActive, disabled: count === 0 && !isActive };
        })
        .sort((a, b) => {
          // Sort: years descending, others alphabetically
          if (group.key === "year") return String(b.value).localeCompare(String(a.value));
          return String(a.value).localeCompare(String(b.value));
        });

      return { key: group.key, label: group.label, values };
    }).filter(Boolean);
  }, [cars, activeFilters]);

  return {
    chipGroups,
    filteredCars,
    activeFilters,
    toggleFilter,
    resetFilters,
    hasActiveFilters,
  };
}
