interface Props {
  required?: boolean;
}

export default function TOSCheckbox({ required = true }: Props) {
  return (
    <label className="flex items-start gap-2 text-xs text-gray-500 cursor-pointer select-none">
      <input
        type="checkbox"
        required={required}
        className="mt-0.5 accent-[#7c3aed] shrink-0"
      />
      <span>
        Li e aceito os{' '}
        <a
          href="/tos-marketplace"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#7c3aed] underline underline-offset-2 hover:text-[#6d28d9] transition-colors"
        >
          termos de compra
        </a>
        .
      </span>
    </label>
  );
}
