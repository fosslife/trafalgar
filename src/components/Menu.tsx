export const Menu = {
  Divider: function Divider() {
    return <div className="h-px bg-gray-200 my-1" />;
  },
  Item: function Item({
    icon: Icon,
    label,
    shortcut,
    onClick,
    disabled,
  }: {
    icon: any;
    label: string;
    shortcut?: string;
    onClick: () => void;
    disabled?: boolean;
  }) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`w-full px-3 py-1.5 text-sm text-left flex items-center space-x-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <Icon className="w-4 h-4" />
        <span className="flex-1">{label}</span>
        {shortcut && <span className="text-xs text-gray-400">{shortcut}</span>}
      </button>
    );
  },
};
