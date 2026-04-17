/** Helper hook for pagination logic */
export function usePagination<T>(items: T[], itemsPerPage: number = 6) {
  const totalPages = Math.ceil(items.length / itemsPerPage)
  
  const getPageItems = (page: number) => {
    const start = (page - 1) * itemsPerPage
    const end = start + itemsPerPage
    return items.slice(start, end)
  }

  return { totalPages, getPageItems }
}
