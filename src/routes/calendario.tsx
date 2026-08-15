import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/calendario')({
  component: CalendarioPage,
})

function CalendarioPage() {
  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">

        <h1 className="text-2xl sm:text-4xl font-bold text-violet-700">
          Calendário de Mentorias
        </h1>

        <p className="mt-2 text-sm sm:text-base text-slate-600">
          Escolha uma data disponível para marcar sua mentoria individual.
        </p>

        <div className="mt-6 sm:mt-8 rounded-2xl bg-white p-3 sm:p-8 shadow-lg">

          <div className="grid grid-cols-5 sm:grid-cols-7 gap-2 sm:gap-4">

            {Array.from({ length: 31 }).map((_, index) => (

              <button
                key={index}
                className="rounded-xl border p-2 sm:p-6 text-sm sm:text-base transition hover:bg-violet-600 hover:text-white"
              >
                {index + 1}
              </button>

            ))}

          </div>

        </div>

      </div>
    </div>
  )
}