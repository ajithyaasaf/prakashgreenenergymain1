// Format currency in Indian Rupees
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format large numbers with abbreviations (like 42.8L for 4,280,000)
export function formatLargeNumber(num: number): string {
  if (num >= 10000000) {
    return `₹${(num / 10000000).toFixed(1)}Cr`;
  } else if (num >= 100000) {
    return `₹${(num / 100000).toFixed(1)}L`;
  } else if (num >= 1000) {
    return `₹${(num / 1000).toFixed(1)}K`;
  } else {
    return `₹${num}`;
  }
}

import { DateValue, getDateFromTimestamp } from '@/types/firebase-types';

// Format date to DD MMM YYYY
export function formatDate(date: DateValue | null | undefined): string {
  if (!date) return "N/A";
  
  try {
    // Use the getDateFromTimestamp utility to handle various date formats
    const d = getDateFromTimestamp(date);
    
    if (!d) {
      return "Invalid date";
    }
    
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid date";
  }
}

// Format date to full format (Monday, 05 Jun 2023)
export function formatDateFull(date: DateValue | null | undefined): string {
  if (!date) return "N/A";
  
  try {
    // Use the getDateFromTimestamp utility to handle various date formats
    const d = getDateFromTimestamp(date);
    
    if (!d) {
      return "Invalid date";
    }
    
    return d.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (error) {
    console.error("Error formatting full date:", error);
    return "Invalid date";
  }
}

// Format time to HH:MM AM/PM
export function formatTime(date: DateValue | null | undefined): string {
  if (!date) return "N/A";
  
  try {
    // Use the getDateFromTimestamp utility to handle various date formats
    const d = getDateFromTimestamp(date);
    
    if (!d) {
      return "Invalid time";
    }
    
    return d.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error("Error formatting time:", error);
    return "Invalid time";
  }
}

// Format date to relative time (e.g., "2 hours ago", "Yesterday")
export function formatRelativeTime(date: DateValue | null | undefined): string {
  if (!date) return "N/A";
  
  try {
    // Use the getDateFromTimestamp utility to handle various date formats
    const d = getDateFromTimestamp(date);
    
    if (!d) {
      return "Invalid date";
    }
    
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 1) {
      return 'Just now';
    } else if (minutes < 60) {
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    } else if (hours < 24) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else if (days < 2) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return formatDate(d);
    }
  } catch (error) {
    console.error("Error formatting relative time:", error);
    return "Invalid date";
  }
}

// Format percentage with + or - prefix
export function formatPercentageChange(value: number): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}%`;
}

// Get initials from a name (e.g., "Arjun Sharma" => "AS")
export function getInitials(name: string): string {
  if (!name) return '';
  
  const words = name.split(' ');
  if (words.length === 1) {
    return words[0][0].toUpperCase();
  }
  
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

// Generate a random color based on a string (for user avatars, etc.)
export function getColorFromString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 50%)`;
}
