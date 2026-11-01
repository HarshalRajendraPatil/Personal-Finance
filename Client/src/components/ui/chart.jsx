import * as React from 'react';
import * as RechartsPrimitive from 'recharts';
import { cn } from '../../utils/cn';

// Format: { [key: string]: { label: string, color?: string, icon?: React.ComponentType } }
const ChartContext = React.createContext(null);

function useChart() {
  const context = React.useContext(ChartContext);
  return context || { config: {} };
}

const ChartContainer = React.forwardRef(
  ({ id, className, children, config = {}, ...props }, ref) => {
    const uniqueId = React.useId();
    const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`;

    return (
      <ChartContext.Provider value={{ config: config || {} }}>
        <div
          data-chart={chartId}
          ref={ref}
          className={cn(
            "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-gray-500 [&_.recharts-cartesian-grid_line]:stroke-gray-100 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-gray-200 [&_.recharts-polar-grid_[stroke]]:stroke-gray-100 [&_.recharts-radial-bar-background-sector]:fill-gray-100 [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-gray-100/50 [&_.recharts-reference-line_[stroke]]:stroke-gray-200 [&_.recharts-sector[stroke]]:stroke-transparent [&_.recharts-surface]:overflow-visible dark:[&_.recharts-cartesian-axis-tick_text]:fill-slate-400 dark:[&_.recharts-cartesian-grid_line]:stroke-slate-800/80 dark:[&_.recharts-curve.recharts-tooltip-cursor]:stroke-slate-700 dark:[&_.recharts-polar-grid_[stroke]]:stroke-slate-800/80 dark:[&_.recharts-radial-bar-background-sector]:fill-slate-800 dark:[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-slate-800/50 dark:[&_.recharts-reference-line_[stroke]]:stroke-slate-700",
            className
          )}
          {...props}
        >
          <ChartStyle id={chartId} config={config} />
          <RechartsPrimitive.ResponsiveContainer>
            {children}
          </RechartsPrimitive.ResponsiveContainer>
        </div>
      </ChartContext.Provider>
    );
  }
);
ChartContainer.displayName = 'ChartContainer';

const ChartStyle = ({ id, config }) => {
  if (!config) {
    return null;
  }

  const colorConfig = Object.entries(config || {}).filter(
    ([, itemConfig]) => itemConfig && itemConfig.color
  );

  if (!colorConfig.length) {
    return null;
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(config)
          .map(([key, itemConfig]) => {
            const color = itemConfig?.color;
            return color
              ? `[data-chart=${id}] { --color-${key}: ${color}; }`
              : null;
          })
          .filter(Boolean)
          .join('\n'),
      }}
    />
  );
};

const ChartTooltip = RechartsPrimitive.Tooltip;

const ChartTooltipContent = React.forwardRef(
  (
    {
      active,
      payload,
      className,
      indicator = 'dot',
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
      config: customConfig,
    },
    ref
  ) => {
    const chartContext = useChart();
    const config = customConfig || chartContext?.config || {};

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) {
        return null;
      }

      const [item] = payload;
      const key = `${labelKey || item?.dataKey || item?.name || 'value'}`;
      const itemConfig = getPayloadConfigFromPayload(config, item, key);
      const value =
        !labelKey && typeof label === 'string'
          ? config[label]?.label || label
          : itemConfig?.label;

      if (labelFormatter) {
        return (
          <div className={cn('font-semibold text-gray-900 dark:text-white', labelClassName)}>
            {labelFormatter(value, payload)}
          </div>
        );
      }

      if (!value) {
        return null;
      }

      return <div className={cn('font-semibold text-gray-900 dark:text-white', labelClassName)}>{value}</div>;
    }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey]);

    if (!active || !payload?.length) {
      return null;
    }

    const nestLabel = payload.length === 1 && indicator !== 'dot';

    return (
      <div
        ref={ref}
        className={cn(
          'grid min-w-[9rem] items-start gap-1.5 rounded-xl border border-gray-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-3 text-xs shadow-xl backdrop-blur-md transition-all ease-in-out text-gray-900 dark:text-slate-100',
          className
        )}
      >
        {!nestLabel ? tooltipLabel : null}
        <div className="grid gap-1.5">
          {payload.map((item, index) => {
            const key = `${nameKey || item.name || item.dataKey || 'value'}`;
            const itemConfig = getPayloadConfigFromPayload(config, item, key);
            const indicatorColor = color || item.payload?.fill || item.color;

            return (
              <div
                key={item.dataKey || index}
                className={cn(
                  'flex w-full flex-wrap items-center justify-between gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-gray-500',
                  indicator === 'dot' && 'items-center'
                )}
              >
                {formatter && item?.value !== undefined && item.name ? (
                  formatter(item.value, item.name, item, index, item.payload)
                ) : (
                  <>
                    <div className="flex items-center gap-1.5">
                      {!hideIndicator && (
                        <div
                          className={cn(
                            'shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]',
                            {
                              'h-2.5 w-2.5 rounded-full': indicator === 'dot',
                              'w-1 h-3': indicator === 'line',
                              'w-0 border-[1.5px] border-dashed bg-transparent':
                                indicator === 'dashed',
                              'my-0.5': nestLabel && indicator === 'dashed',
                            }
                          )}
                          style={{
                            backgroundColor: indicatorColor,
                            borderColor: indicatorColor,
                          }}
                        />
                      )}
                      <span className="text-gray-500 dark:text-slate-400 font-medium">
                        {itemConfig?.label || item.name}
                      </span>
                    </div>
                    {item.value !== undefined && (
                      <span className="font-mono font-bold text-gray-900 dark:text-white tabular-nums">
                        {typeof item.value === 'number'
                          ? item.value.toLocaleString('en-IN')
                          : item.value}
                      </span>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);
ChartTooltipContent.displayName = 'ChartTooltipContent';

const ChartLegend = RechartsPrimitive.Legend;

const ChartLegendContent = React.forwardRef(
  ({ className, hideIcon = false, payload, verticalAlign = 'bottom', nameKey, config: customConfig }, ref) => {
    const chartContext = useChart();
    const config = customConfig || chartContext?.config || {};

    if (!payload?.length) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-center gap-4 pt-3 text-xs',
          verticalAlign === 'top' ? 'pb-3' : 'pt-3',
          className
        )}
      >
        {payload.map((item) => {
          const key = `${nameKey || item.dataKey || 'value'}`;
          const itemConfig = getPayloadConfigFromPayload(config, item, key);

          return (
            <div
              key={item.value}
              className="flex items-center gap-1.5 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {!hideIcon && (
                <div
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor: item.color,
                  }}
                />
              )}
              <span className="font-medium">{itemConfig?.label || item.value}</span>
            </div>
          );
        })}
      </div>
    );
  }
);
ChartLegendContent.displayName = 'ChartLegendContent';

// Helper to extract item configuration
function getPayloadConfigFromPayload(config, payload, key) {
  if (!config || typeof payload !== 'object' || payload === null) {
    return undefined;
  }

  const payloadPayload =
    'payload' in payload &&
    typeof payload.payload === 'object' &&
    payload.payload !== null
      ? payload.payload
      : undefined;

  let configLabelKey = key;

  if (
    key in payload &&
    typeof payload[key] === 'string'
  ) {
    configLabelKey = payload[key];
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key] === 'string'
  ) {
    configLabelKey = payloadPayload[key];
  }

  return config[configLabelKey] || config[key];
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
};
