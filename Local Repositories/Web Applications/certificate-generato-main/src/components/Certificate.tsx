import { forwardRef } from 'react'

interface CertificateProps {
  courseName: string
  traineeName: string
  completionDate: string
  directorName?: string
  directorTitle?: string
}

const LogoSVG = () => (
  <svg width="140" height="100" viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Blue curved line - left side of heart */}
    <path
      d="M100 75 C100 75, 60 45, 55 30 C50 15, 65 5, 80 15 C90 22, 100 35, 100 35"
      stroke="#1E5A8A"
      strokeWidth="5"
      strokeLinecap="round"
      fill="none"
    />
    {/* Orange curved line - right side of heart */}
    <path
      d="M100 75 C100 75, 140 45, 145 30 C150 15, 135 5, 120 15 C110 22, 100 35, 100 35"
      stroke="#E8965A"
      strokeWidth="5"
      strokeLinecap="round"
      fill="none"
    />
    {/* Epworth text */}
    <text x="100" y="110" textAnchor="middle" fontFamily="Georgia, serif" fontSize="32" fontWeight="bold" fill="#1E3A5F">Epworth</text>
    {/* FAMILY RESOURCES text */}
    <text x="100" y="128" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12" letterSpacing="3" fill="#1E3A5F">FAMILY RESOURCES</text>
  </svg>
)

export const Certificate = forwardRef<HTMLDivElement, CertificateProps>(
  ({ courseName, traineeName, completionDate, directorName = "Brandon Hinrichs", directorTitle = "In-Home Director" }, ref) => {
    return (
      <div ref={ref} className="certificate-wrapper">
        <div className="certificate-container">
          {/* Border design */}
          <div className="absolute inset-0 border-[8px] border-[var(--certificate-navy)] shadow-2xl" />
          <div className="absolute inset-[8px] border-[3px] border-[var(--certificate-orange)]" />
          <div className="absolute inset-[14px] border border-[var(--certificate-light-orange)] opacity-40" />

          {/* Logo at top */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2">
            <LogoSVG />
          </div>

          <div className="certificate-content">
            <div className="flex-1 flex flex-col items-center justify-center text-center w-full">
              {/* Certificate Title */}
              <div className="mb-6">
                <h1
                  className="certificate-title"
                  style={{ fontFamily: 'var(--font-playfair)' }}
                >
                  Certificate
                </h1>
                <div
                  className="certificate-subtitle"
                  style={{ fontFamily: 'var(--font-crimson)' }}
                >
                  of Completion
                </div>
              </div>

              {/* Main Content */}
              <div className="w-full max-w-lg">
                <p
                  className="certificate-text-sm"
                  style={{ fontFamily: 'var(--font-crimson)' }}
                >
                  This certifies that
                </p>

                {/* Participant Name */}
                <div className="my-4">
                  <div
                    className="certificate-name"
                    style={{ fontFamily: 'var(--font-signature)', fontWeight: 600 }}
                  >
                    {traineeName || "Trainee Name"}
                  </div>
                  <div className="h-0.5 w-3/4 mx-auto bg-[var(--certificate-navy)] opacity-30" />
                </div>

                <p
                  className="certificate-text-sm mb-4"
                  style={{ fontFamily: 'var(--font-crimson)' }}
                >
                  has successfully completed the training program
                </p>

                {/* Course Name */}
                <h2
                  className="certificate-course-title"
                  style={{ fontFamily: 'var(--font-playfair)', color: 'var(--certificate-navy)' }}
                >
                  {courseName || "Course Name"}
                </h2>

                {/* Completion Date */}
                <div
                  className="certificate-text-sm"
                  style={{ fontFamily: 'var(--font-crimson)' }}
                >
                  <span className="opacity-70">Completed on</span>{' '}
                  <span className="font-semibold">{completionDate || "MM/DD/YYYY"}</span>
                </div>
              </div>
            </div>

            {/* Signatures */}
            <div className="flex justify-center gap-16 mt-6 mb-4">
              <div className="text-center w-56">
                <div
                  className="certificate-signature-name"
                  style={{ fontFamily: 'var(--font-signature)', fontWeight: 600 }}
                >
                  {directorName}
                </div>
                <div className="h-0.5 w-full bg-[var(--certificate-navy)] opacity-50 my-1" />
                <div
                  className="text-xs tracking-wide opacity-70"
                  style={{ fontFamily: 'var(--font-space)', color: 'var(--certificate-navy)' }}
                >
                  {directorTitle}
                </div>
              </div>

              <div className="text-center w-56">
                <div
                  className="certificate-signature-name"
                  style={{ fontFamily: 'var(--font-signature)', fontWeight: 600 }}
                >
                  {traineeName || "Trainee Name"}
                </div>
                <div className="h-0.5 w-full bg-[var(--certificate-navy)] opacity-50 my-1" />
                <div
                  className="text-xs tracking-wide opacity-70"
                  style={{ fontFamily: 'var(--font-space)', color: 'var(--certificate-navy)' }}
                >
                  Participant
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
)

Certificate.displayName = 'Certificate'
