import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCalendarEvents } from '../../store/calendarSlice';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ArrowRightLeft, Building2, Repeat, Target } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const getDaysInMonth = (year, month) => {
  const date = new Date(year, month, 1);
  const days = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

const EVENT_COLORS = {
  'Transaction': 'bg-gray-100 text-gray-700 border-gray-200',
  'Recurring': 'bg-blue-100 text-blue-700 border-blue-200',
  'Loan': 'bg-orange-100 text-orange-700 border-orange-200',
  'Goal': 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const getEventIcon = (source) => {
  switch (source) {
    case 'Transaction': return <ArrowRightLeft className="w-3 h-3 mr-1" />;
    case 'Recurring': return <Repeat className="w-3 h-3 mr-1" />;
    case 'Loan': return <Building2 className="w-3 h-3 mr-1" />;
    case 'Goal': return <Target className="w-3 h-3 mr-1" />;
    default: return null;
  }
};

const Calendar = () => {
  const dispatch = useDispatch();
  const { events, isLoading } = useSelector(s => s.calendar);
  
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0); // Last day of month
    
    // Add some padding to fetch surrounding days
    start.setDate(start.getDate() - 7);
    end.setDate(end.getDate() + 7);

    dispatch(fetchCalendarEvents({ 
      startDate: start.toISOString(), 
      endDate: end.toISOString() 
    }));
  }, [dispatch, currentDate]);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const today = () => {
    setCurrentDate(new Date());
  };

  const days = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDayOfMonth = days[0].getDay(); // 0 is Sunday
  
  // Create padding for the grid (previous month days)
  const paddingDays = Array.from({ length: firstDayOfMonth }).map((_, i) => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
    d.setDate(d.getDate() - (firstDayOfMonth - 1 - i));
    return d;
  });

  const calendarGrid = [...paddingDays, ...days];

  // Helper to extract local date string
  const getLocalDateStr = (dateObj) => {
    const d = new Date(dateObj);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Group events by date string YYYY-MM-DD
  const eventsByDate = events.reduce((acc, ev) => {
    // ev.date is an ISO string. We extract the local date representation.
    const dateStr = getLocalDateStr(ev.date);
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(ev);
    return acc;
  }, {});

  const isToday = (d) => {
    const td = new Date();
    return d.getDate() === td.getDate() && d.getMonth() === td.getMonth() && d.getFullYear() === td.getFullYear();
  };

  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-8 px-1 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Financial Calendar</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-gray-500">Track past transactions and visualize upcoming cash flows.</p>
        </div>
        
        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto space-x-3 mt-1 sm:mt-0">
          <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-50 border-r border-gray-200 transition-colors"><ChevronLeft className="w-4 h-4 text-gray-600" /></button>
            <button onClick={today} className="px-3 py-1.5 text-xs sm:text-sm font-medium hover:bg-gray-50 border-r border-gray-200 transition-colors">Today</button>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-50 transition-colors"><ChevronRight className="w-4 h-4 text-gray-600" /></button>
          </div>
          <h2 className="text-base sm:text-xl font-bold text-gray-800 text-right sm:text-center sm:min-w-[150px]">
            {currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-x-auto">
        <div className="min-w-[640px] sm:min-w-0">
          {/* Days Header */}
          <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider border-r last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 auto-rows-fr relative">
            {isLoading && (
              <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent" />
              </div>
            )}
          {calendarGrid.map((date, idx) => {
            const dateStr = getLocalDateStr(date);
            const dayEvents = eventsByDate[dateStr] || [];
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            const todayMark = isToday(date);
            
            // Calculate daily summary
            const income = dayEvents.filter(e => e.type === 'Income').reduce((s, e) => s + e.amount, 0);
            const expense = dayEvents.filter(e => e.type === 'Expense').reduce((s, e) => s + e.amount, 0);

            return (
              <div key={idx} className={`min-h-[120px] border-b border-r p-2 transition-colors hover:bg-gray-50 ${!isCurrentMonth ? 'bg-gray-50/50 text-gray-400' : ''}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${todayMark ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>
                    {date.getDate()}
                  </span>
                  
                  {/* Daily Summary (only show if there are events) */}
                  {(income > 0 || expense > 0) && (
                    <div className="flex flex-col items-end text-[10px] font-bold">
                      {income > 0 && <span className="text-emerald-600">+{fmt(income)}</span>}
                      {expense > 0 && <span className="text-red-600">-{fmt(expense)}</span>}
                    </div>
                  )}
                </div>
                
                <div className="space-y-1.5 overflow-y-auto max-h-[100px] pr-1 custom-scrollbar">
                  {dayEvents.map(ev => {
                    const colorClass = EVENT_COLORS[ev.source] || EVENT_COLORS['Transaction'];
                    return (
                      <div key={ev.id} title={ev.title} className={`px-1.5 py-1 text-[11px] rounded border leading-tight truncate flex items-center ${colorClass} ${ev.isFuture ? 'border-dashed opacity-80' : ''}`}>
                        {getEventIcon(ev.source)}
                        <span className="flex-1 truncate">{ev.title}</span>
                        <span className={`font-semibold ml-1 ${ev.type === 'Income' ? 'text-emerald-700' : 'text-red-700'}`}>
                          {ev.type === 'Income' ? '+' : '-'}{Math.round(ev.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center space-x-2"><div className="w-3 h-3 rounded bg-gray-100 border border-gray-200"></div><span className="text-gray-600">Manual Transaction</span></div>
        <div className="flex items-center space-x-2"><div className="w-3 h-3 rounded bg-blue-100 border border-blue-200"></div><span className="text-gray-600">Recurring / Bill</span></div>
        <div className="flex items-center space-x-2"><div className="w-3 h-3 rounded bg-orange-100 border border-orange-200"></div><span className="text-gray-600">Loan EMI</span></div>
        <div className="flex items-center space-x-2"><div className="w-3 h-3 rounded border border-dashed border-gray-400 bg-gray-50"></div><span className="text-gray-600">Upcoming / Forecasted</span></div>
      </div>
    </div>
  );
};

export default Calendar;
