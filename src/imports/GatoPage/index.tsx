import svgPaths from "./svg-lybtjt1ays";
import imgCanvas from "./b441f1258ffc6d705ecb263345561476f08501a7.png";

function GatoPage1() {
  return (
    <div className="relative shrink-0 size-[12px]" data-name="GatoPage">
      <svg className="absolute block inset-0 size-full" fill="none" height="12" preserveAspectRatio="none" viewBox="0 0 12 12" width="12">
        <g id="GatoPage">
          <path d="M7.5 9.5L4 6L7.5 2.5" id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.3" />
        </g>
      </svg>
    </div>
  );
}

function Link() {
  return (
    <div className="relative shrink-0" data-name="Link">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[6px] items-center relative size-full">
        <GatoPage1 />
        <p className="[word-break:break-word] font-['Menlo:Regular',sans-serif] leading-[15px] not-italic relative shrink-0 text-[10px] text-[rgba(255,255,255,0.3)] tracking-[1px] uppercase whitespace-nowrap">Signal</p>
      </div>
    </div>
  );
}

function Container1() {
  return <div className="h-0 relative shrink-0 w-[64px]" data-name="Container" />;
}

function Heading() {
  return (
    <div className="relative shrink-0 w-full" data-name="Heading 1">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center relative size-full">
        <p className="[word-break:break-word] font-['Roboto_Mono:Medium',sans-serif] font-medium leading-[20px] relative shrink-0 text-[14px] text-[rgba(255,255,255,0.9)] text-center tracking-[1.4px] uppercase whitespace-nowrap">Gato</p>
      </div>
    </div>
  );
}

function Paragraph() {
  return (
    <div className="relative shrink-0 w-full" data-name="Paragraph">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center relative size-full">
        <p className="[word-break:break-word] font-['Menlo:Regular',sans-serif] leading-[13.5px] not-italic relative shrink-0 text-[9px] text-[rgba(255,255,255,0.3)] text-center tracking-[0.45px] whitespace-nowrap">concatenative synthesis explorer</p>
      </div>
    </div>
  );
}

function Container2() {
  return (
    <div className="absolute left-[453px] top-[2.5px] w-[188px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <Heading />
        <Paragraph />
      </div>
    </div>
  );
}

function Container() {
  return (
    <div className="content-stretch flex items-center justify-between px-[16px] py-[12px] relative shrink-0 w-[1094px]" data-name="Container">
      <Link />
      <Container1 />
      <Container2 />
    </div>
  );
}

function Text() {
  return (
    <div className="relative shrink-0" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <p className="[word-break:break-word] font-['Menlo:Regular',sans-serif] leading-[13.5px] not-italic relative shrink-0 text-[9px] text-[rgba(255,255,255,0.25)] tracking-[0.9px] uppercase whitespace-nowrap">Audio</p>
      </div>
    </div>
  );
}

function Container4() {
  return <div className="bg-[rgba(255,255,255,0.08)] flex-[272.938_0_0] h-px min-w-px relative" data-name="Container" />;
}

function SectionLabel() {
  return (
    <div className="relative shrink-0 w-full" data-name="SectionLabel">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center relative size-full">
        <Text />
        <Container4 />
      </div>
    </div>
  );
}

function Icon() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="20" preserveAspectRatio="none" viewBox="0 0 20 20" width="20">
        <g id="Icon">
          <path d={svgPaths.p1c54d000} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.2" strokeWidth="1.25" />
        </g>
      </svg>
    </div>
  );
}

function Container5() {
  return (
    <div className="bg-[rgba(255,255,255,0.02)] content-stretch flex flex-col gap-[6px] h-[80px] items-center justify-center p-[2px] relative rounded-[6px] shrink-0 w-full" data-name="Container">
      <div aria-hidden className="absolute border-2 border-[rgba(255,255,255,0.15)] border-dashed inset-0 pointer-events-none rounded-[6px]" />
      <Icon />
      <p className="[word-break:break-word] font-['Menlo:Regular',sans-serif] leading-[15px] not-italic relative shrink-0 text-[10px] text-[rgba(255,255,255,0.25)] whitespace-nowrap">Drop audio or click to browse</p>
    </div>
  );
}

function ContainerMargin() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container:margin">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pt-[12px] relative size-full">
        <Container5 />
      </div>
    </div>
  );
}

function Container3() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <SectionLabel />
        <ContainerMargin />
      </div>
    </div>
  );
}

function Text1() {
  return (
    <div className="relative shrink-0" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <p className="[word-break:break-word] font-['Menlo:Regular',sans-serif] leading-[13.5px] not-italic relative shrink-0 text-[9px] text-[rgba(255,255,255,0.25)] tracking-[0.9px] uppercase whitespace-nowrap">Corpus Analysis</p>
      </div>
    </div>
  );
}

function Container7() {
  return <div className="bg-[rgba(255,255,255,0.08)] flex-[209.75_0_0] h-px min-w-px relative" data-name="Container" />;
}

function SectionLabel1() {
  return (
    <div className="relative shrink-0 w-full" data-name="SectionLabel">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center relative size-full">
        <Text1 />
        <Container7 />
      </div>
    </div>
  );
}

function Text2() {
  return (
    <div className="h-full relative shrink-0" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <p className="[word-break:break-word] font-['Menlo:Regular',sans-serif] leading-[15px] not-italic relative shrink-0 text-[10px] text-[rgba(255,255,255,0.4)] whitespace-nowrap">Grain Size</p>
      </div>
    </div>
  );
}

function Text3() {
  return (
    <div className="h-full relative shrink-0" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <p className="[word-break:break-word] font-['Menlo:Regular',sans-serif] leading-[15px] not-italic relative shrink-0 text-[10px] text-[rgba(255,255,255,0.5)] whitespace-nowrap">120ms</p>
      </div>
    </div>
  );
}

function Container10() {
  return (
    <div className="h-[19px] relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start justify-between pb-[4px] relative size-full">
        <Text2 />
        <Text3 />
      </div>
    </div>
  );
}

function RangeSlider() {
  return <div className="absolute bg-[rgba(255,255,255,0.1)] h-[4px] left-0 rounded-[16777200px] top-[14px] w-[291px]" data-name="Range Slider" />;
}

function Container11() {
  return (
    <div className="h-[24px] relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <RangeSlider />
      </div>
    </div>
  );
}

function Container9() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <Container10 />
        <Container11 />
      </div>
    </div>
  );
}

function Text4() {
  return (
    <div className="h-full relative shrink-0" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <p className="[word-break:break-word] font-['Menlo:Regular',sans-serif] leading-[15px] not-italic relative shrink-0 text-[10px] text-[rgba(255,255,255,0.4)] whitespace-nowrap">Overlap</p>
      </div>
    </div>
  );
}

function Text5() {
  return (
    <div className="h-full relative shrink-0" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <p className="[word-break:break-word] font-['Menlo:Regular',sans-serif] leading-[15px] not-italic relative shrink-0 text-[10px] text-[rgba(255,255,255,0.5)] whitespace-nowrap">50%</p>
      </div>
    </div>
  );
}

function Container13() {
  return (
    <div className="h-[19px] relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start justify-between pb-[4px] relative size-full">
        <Text4 />
        <Text5 />
      </div>
    </div>
  );
}

function RangeSlider1() {
  return <div className="absolute bg-[rgba(255,255,255,0.1)] h-[4px] left-0 rounded-[16777200px] top-[14px] w-[291px]" data-name="Range Slider" />;
}

function Container14() {
  return (
    <div className="h-[24px] relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <RangeSlider1 />
      </div>
    </div>
  );
}

function Container12() {
  return (
    <div className="h-[55px] relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pt-[12px] relative size-full">
        <Container13 />
        <Container14 />
      </div>
    </div>
  );
}

function Text6() {
  return (
    <div className="relative shrink-0" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <p className="[word-break:break-word] font-['Menlo:Regular',sans-serif] leading-[15px] not-italic relative shrink-0 text-[10px] text-[rgba(255,255,255,0.25)] whitespace-nowrap">No corpus</p>
      </div>
    </div>
  );
}

function Button() {
  return (
    <div className="relative shrink-0" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center justify-center relative size-full">
        <p className="[word-break:break-word] font-['Menlo:Regular',sans-serif] leading-[15px] not-italic relative shrink-0 text-[10px] text-[rgba(255,255,255,0.15)] text-center whitespace-nowrap">Reanalyze ↻</p>
      </div>
    </div>
  );
}

function Container15() {
  return (
    <div className="h-[31px] relative shrink-0 w-[312.531px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-between pt-[16px] relative size-full">
        <Text6 />
        <Button />
      </div>
    </div>
  );
}

function Container8() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <Container9 />
      <Container12 />
      <Container15 />
    </div>
  );
}

function ContainerMargin1() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container:margin">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pt-[12px] relative size-full">
        <Container8 />
      </div>
    </div>
  );
}

function Container6() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <SectionLabel1 />
        <ContainerMargin1 />
      </div>
    </div>
  );
}

function Text7() {
  return (
    <div className="relative shrink-0" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <p className="[word-break:break-word] font-['Menlo:Regular',sans-serif] leading-[13.5px] not-italic relative shrink-0 text-[9px] text-[rgba(255,255,255,0.25)] tracking-[0.9px] uppercase whitespace-nowrap">Axes</p>
      </div>
    </div>
  );
}

function Container17() {
  return <div className="bg-[rgba(255,255,255,0.08)] flex-[279.25_0_0] h-px min-w-px relative" data-name="Container" />;
}

function SectionLabel2() {
  return (
    <div className="relative shrink-0 w-full" data-name="SectionLabel">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center relative size-full">
        <Text7 />
        <Container17 />
      </div>
    </div>
  );
}

function Text8() {
  return (
    <div className="h-[18px] relative shrink-0 w-[312.531px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[4px] relative size-full">
        <p className="[word-break:break-word] font-['Menlo:Regular',sans-serif] leading-[13.5px] not-italic relative shrink-0 text-[9px] text-[rgba(255,255,255,0.25)] whitespace-nowrap">X Axis</p>
      </div>
    </div>
  );
}

function Dropdown() {
  return (
    <div className="bg-[rgba(255,255,255,0.06)] h-[28.5px] relative rounded-[6px] shrink-0 w-full" data-name="Dropdown">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[6px]" />
    </div>
  );
}

function Container19() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <Text8 />
        <Dropdown />
      </div>
    </div>
  );
}

function Text9() {
  return (
    <div className="h-[18px] relative shrink-0 w-[312.531px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[4px] relative size-full">
        <p className="[word-break:break-word] font-['Menlo:Regular',sans-serif] leading-[13.5px] not-italic relative shrink-0 text-[9px] text-[rgba(255,255,255,0.25)] whitespace-nowrap">Y Axis</p>
      </div>
    </div>
  );
}

function Dropdown1() {
  return (
    <div className="bg-[rgba(255,255,255,0.06)] h-[28.5px] relative rounded-[6px] shrink-0 w-full" data-name="Dropdown">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[6px]" />
    </div>
  );
}

function Container20() {
  return (
    <div className="h-[54.5px] relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pt-[8px] relative size-full">
        <Text9 />
        <Dropdown1 />
      </div>
    </div>
  );
}

function Container18() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <Container19 />
      <Container20 />
    </div>
  );
}

function ContainerMargin2() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container:margin">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pt-[12px] relative size-full">
        <Container18 />
      </div>
    </div>
  );
}

function Container16() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <SectionLabel2 />
        <ContainerMargin2 />
      </div>
    </div>
  );
}

function Text10() {
  return (
    <div className="relative shrink-0" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <p className="[word-break:break-word] font-['Menlo:Regular',sans-serif] leading-[13.5px] not-italic relative shrink-0 text-[9px] text-[rgba(255,255,255,0.25)] tracking-[0.9px] uppercase whitespace-nowrap">Interaction</p>
      </div>
    </div>
  );
}

function Container22() {
  return <div className="bg-[rgba(255,255,255,0.08)] flex-[235.023_0_0] h-px min-w-px relative" data-name="Container" />;
}

function SectionLabel3() {
  return (
    <div className="relative shrink-0 w-full" data-name="SectionLabel">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center relative size-full">
        <Text10 />
        <Container22 />
      </div>
    </div>
  );
}

function Button1() {
  return (
    <div className="bg-[#5b00d4] flex-[153.266_0_0] h-full min-w-px relative rounded-[6px]" data-name="Button">
      <div className="flex flex-row items-center justify-center size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center py-[6px] relative size-full">
          <p className="[word-break:break-word] font-['Menlo:Regular',sans-serif] leading-[15px] not-italic relative shrink-0 text-[10px] text-center text-white tracking-[0.5px] uppercase whitespace-nowrap">mouse</p>
        </div>
      </div>
    </div>
  );
}

function Button2() {
  return (
    <div className="bg-[rgba(255,255,255,0.06)] flex-[153.266_0_0] h-full min-w-px relative rounded-[6px]" data-name="Button">
      <div className="flex flex-row items-center justify-center size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center py-[6px] relative size-full">
          <p className="[word-break:break-word] font-['Menlo:Regular',sans-serif] leading-[15px] not-italic relative shrink-0 text-[10px] text-[rgba(255,255,255,0.4)] text-center tracking-[0.5px] uppercase whitespace-nowrap">camera</p>
        </div>
      </div>
    </div>
  );
}

function Container23() {
  return (
    <div className="content-stretch flex gap-[6px] h-[27px] items-start relative shrink-0 w-full" data-name="Container">
      <Button1 />
      <Button2 />
    </div>
  );
}

function ContainerMargin3() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container:margin">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pt-[12px] relative size-full">
        <Container23 />
      </div>
    </div>
  );
}

function Container21() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <SectionLabel3 />
        <ContainerMargin3 />
      </div>
    </div>
  );
}

function GatoControls() {
  return (
    <div className="h-[759px] relative shrink-0 w-full" data-name="GatoControls">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[20px] items-start p-[16px] relative size-full">
          <Container3 />
          <Container6 />
          <Container16 />
          <Container21 />
        </div>
      </div>
    </div>
  );
}

function GatoApp() {
  return (
    <div className="bg-[rgba(0,0,0,0.2)] flex-[1_0_0] min-h-px relative w-full" data-name="GatoApp">
      <div aria-hidden className="absolute border-[rgba(255,255,255,0.08)] border-r border-solid inset-0 pointer-events-none" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pr-px relative size-full">
        <GatoControls />
      </div>
    </div>
  );
}

function Panel() {
  return (
    <div className="flex-[345.531_0_0] h-full min-w-px relative rounded-[15px]" data-name="Panel">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start overflow-clip relative rounded-[inherit] size-full">
        <GatoApp />
      </div>
    </div>
  );
}

function Canvas() {
  return (
    <div className="h-[759px] relative shrink-0 w-full" data-name="Canvas">
      <img alt="" className="absolute bg-clip-padding border-0 border-[transparent] border-solid inset-0 max-w-none object-contain pointer-events-none size-full" src={imgCanvas} />
    </div>
  );
}

function Icon1() {
  return (
    <div className="relative shrink-0 size-[48px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="48" preserveAspectRatio="none" viewBox="0 0 48 48" width="48">
        <g id="Icon" opacity="0.2">
          <path d={svgPaths.p2115e740} fill="var(--fill-0, white)" id="Vector" />
          <path d={svgPaths.p2e1c6e00} fill="var(--fill-0, white)" id="Vector_2" />
          <path d={svgPaths.p3cf9e780} fill="var(--fill-0, white)" id="Vector_3" />
          <path d={svgPaths.p3d636900} fill="var(--fill-0, white)" id="Vector_4" />
        </g>
      </svg>
    </div>
  );
}

function Container24() {
  return (
    <div className="absolute h-[759px] left-0 top-0 w-[744.469px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[12px] items-center justify-center relative size-full">
        <Icon1 />
        <p className="[word-break:break-word] font-['Menlo:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.2)] text-center tracking-[0.55px] whitespace-nowrap">Upload an audio file to generate corpus</p>
      </div>
    </div>
  );
}

function CorpusCanvas() {
  return (
    <div className="bg-[#050410] h-[759px] relative shrink-0 w-full" data-name="CorpusCanvas">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start overflow-clip relative rounded-[inherit] size-full">
        <Canvas />
        <Container24 />
      </div>
    </div>
  );
}

function Panel1() {
  return (
    <div className="flex-[744.469_0_0] h-full min-w-px relative rounded-[15px]" data-name="Panel">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start overflow-clip relative rounded-[inherit] size-full">
        <CorpusCanvas />
      </div>
    </div>
  );
}

function PanelGroup() {
  return (
    <div className="content-stretch flex gap-[11px] h-[759px] items-start justify-center overflow-clip px-[30px] py-[15px] relative shrink-0 w-[1094px]" data-name="PanelGroup">
      <Panel />
      <Panel1 />
    </div>
  );
}

export default function GatoPage() {
  return (
    <div className="bg-[#484848] content-stretch flex flex-col items-center relative size-full" data-name="GatoPage">
      <Container />
      <PanelGroup />
    </div>
  );
}