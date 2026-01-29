import Link from 'next/link'

import { Container, Section } from '@infonomic/uikit/react'

const Page = () => {
  return (
    <main>
      <Section>
        <Container className="max-w-[960px] mx-auto prose">
          <div>
            <h1>Make Stuff Happen</h1>
          </div>
          <p>
            This is a demo of our AI plugins for Lexical, HTML, and Text. Try each by following the links below:
          </p>
          <ul>
            <li>
              <Link href="/lexical" className="text-blue-600 underline">
                Lexical AI Demo
              </Link>
            </li>
            <li>
              <Link href="/html" className="text-blue-600 underline">
                HTML AI Demo
              </Link>
            </li>
            <li>
              <Link href="/text" className="text-blue-600 underline">
                Text AI Demo
              </Link>
            </li>
          </ul>
        </Container>
      </Section>
    </main>
  )
}

export default Page
