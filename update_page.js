const fs = require('fs');

let content = fs.readFileSync('app/page.tsx', 'utf8');

const budgetKeyDownExtract = `  const handleBudgetKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") commitBudgetEdit();
    if (event.key === "Escape") setEditingBudget(false);
  }, [commitBudgetEdit]);`;

const otherExtracts = `  const handleTickerKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>, positionId: string, ticker: string) => {
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        void fetchPrice(positionId, ticker).then(() => {
          shareInputRefs.current[positionId]?.focus();
          shareInputRefs.current[positionId]?.select();
        });
      }
    },
    [fetchPrice],
  );

  const handlePositionMouseEnter = useCallback(
    (position: Position) => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (openTimerRef.current) clearTimeout(openTimerRef.current);
      openTimerRef.current = setTimeout(() => {
        setActivePopoverId(position.id);
        void fetchPerf(position);
      }, 180);
    },
    [fetchPerf],
  );

  const handlePositionMouseLeave = useCallback(() => {
    if (openTimerRef.current) clearTimeout(openTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setActivePopoverId(null);
    }, 130);
  }, []);

  const handlePopoverMouseEnter = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  const handlePopoverMouseLeave = useCallback(() => {
    closeTimerRef.current = setTimeout(() => {
      setActivePopoverId(null);
    }, 130);
  }, []);

  const handleShareChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>, positionId: string) => {
      const next = Number.parseFloat(event.target.value);
      setShares(positionId, Number.isFinite(next) && next >= 0 ? next : 0);
    },
    [setShares],
  );`;

// Insert the budget keydown hook right before `const incrementShares = useCallback(`
content = content.replace('  const incrementShares = useCallback(', budgetKeyDownExtract + '\n\n' + otherExtracts + '\n\n  const incrementShares = useCallback(');

// Replace budget onKeyDown
content = content.replace(`                  onKeyDown={(event) => {
                    if (event.key === "Enter") commitBudgetEdit();
                    if (event.key === "Escape") setEditingBudget(false);
                  }}`, `                  onKeyDown={handleBudgetKeyDown}`);

// Replace ticker onKeyDown
content = content.replace(`                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === "Tab") {
                        event.preventDefault();
                        void fetchPrice(position.id, position.ticker).then(() => {
                          shareInputRefs.current[position.id]?.focus();
                          shareInputRefs.current[position.id]?.select();
                        });
                      }
                    }}`, `                    onKeyDown={(event) => handleTickerKeyDown(event, position.id, position.ticker)}`);


// Replace position onMouseEnter
content = content.replace(`                    onMouseEnter={() => {
                      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
                      if (openTimerRef.current) clearTimeout(openTimerRef.current);
                      openTimerRef.current = setTimeout(() => {
                        setActivePopoverId(position.id);
                        void fetchPerf(position);
                      }, 180);
                    }}`, `                    onMouseEnter={() => handlePositionMouseEnter(position)}`);

// Replace position onMouseLeave
content = content.replace(`                    onMouseLeave={() => {
                      if (openTimerRef.current) clearTimeout(openTimerRef.current);
                      closeTimerRef.current = setTimeout(() => {
                        setActivePopoverId(null);
                      }, 130);
                    }}`, `                    onMouseLeave={handlePositionMouseLeave}`);

// Replace popover onMouseEnter
content = content.replace(`                        onMouseEnter={() => {
                          if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
                        }}`, `                        onMouseEnter={handlePopoverMouseEnter}`);

// Replace popover onMouseLeave
content = content.replace(`                        onMouseLeave={() => {
                          closeTimerRef.current = setTimeout(() => {
                            setActivePopoverId(null);
                          }, 130);
                        }}`, `                        onMouseLeave={handlePopoverMouseLeave}`);

// Replace share onChange
content = content.replace(`                      onChange={(event) => {
                        const next = Number.parseFloat(event.target.value);
                        setShares(position.id, Number.isFinite(next) && next >= 0 ? next : 0);
                      }}`, `                      onChange={(event) => handleShareChange(event, position.id)}`);

fs.writeFileSync('app/page.tsx', content);
