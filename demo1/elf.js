class Elf { // Expressive Lyrics Format
    static EventsEnum = Object.freeze({
        SHOW_LINE: 1,
        HIDE_LINE: 3,
        SAY:       2
    })

    static sort_events(events) {
        return events.sort((a,b)=>a[0]-b[0]==0?a[1]-b[1]:a[0]-b[0])
    }

    static process(sections) {
        let all_events = []
        let i = 0;
        let unique_id = 0
        while (true) {
            let name = "MAIN"+i
            let section = sections[name]
            console.log(section)
            if (!section) break;

            let events = []

            let e = this.EventsEnum
            
            section.forEach((line,line_i)=>{
                section[line_i].unique = unique_id+0
                const line_id = unique_id
                events.push([line.start,e.SHOW_LINE,{channel:i,line:line_i,unique:line_id}])
                unique_id++
                line.pieces.forEach((piece,piece_i)=>{
                    events.push([piece.s,e.SAY,{channel:i,line:line_i,piece:piece_i,unique:unique_id}])
                    section[line_i].pieces[piece_i].unique = unique_id+0
                    unique_id++
                })
                events.push([line.end,e.HIDE_LINE,{channel:i,line:line_i,unique:line_id}])
            })


            all_events = [...all_events,...events]
            i++
        }
        all_events = this.sort_events(all_events)

        return {events:all_events,sections:sections}
    }

    static parse(text) {
        const file_lines = text.replace("\r","").split("\n").filter(line => line?.trim().length);
        const div = file_lines[0];
        console.log(div)
        let file_sections = []
        let file_section_names = [] 
        let i = 0;
        while (true) { i++; //we can skip the first line
            if (!file_lines[i]) break;
            let [_,section_name,section_lines] = file_lines[i].match("([A-Z_0-9]+)\\s+([0-9]+)")
            file_section_names.push(section_name)
            section_lines = section_lines*1;
            let section = []
            for (let j = 0; j < section_lines; j++) {
                i++; section.push(file_lines[i])
            }
            // console.log(section,section.length,section_lines)
            file_sections.push(section)
        }


        return Object.fromEntries(file_sections.map((sect,i)=>sect.map(line=>file_section_names[i]=="METADATA"?this.parse_metadata(line):this.process_line([...this.parse_line(line,div)]))).map((v,i)=>[file_section_names[i],file_section_names[i]=="METADATA"?Object.assign({},...v):v]))
    }

    static process_line(line) {
        let max = -1/0
        let min = 1/0
        line.map(v=>{v.s=(v.s??0)+(v.m??0)*60+(v.h??0)*360; return v}).forEach(v=>[max,min]=[Math.max(v.s,max),Math.min(v.s,min)])
        // console.log(min,max)
        return {pieces:line,start:min,end:max}
    }

    static parse_line(line,div) {
        let large_token_text = ""
        let large_token = ""
        let token = ""
        let div_detect = ""
        let dl = div.length
        let disable = false

        let tokens = []

        // console.log(line)

        let i = 0;
        while (i<line.length) {
            let c = line[i];
            if (!disable) {
                if (c=="\\") {
                    disable = true;
                    continue;
                }
                div_detect += c
                div_detect = div_detect.slice(-dl)
            }
            large_token_text += c
            if (div_detect==div) {
                div_detect = ""
                large_token_text = large_token_text.slice(0,-dl)
                let metadata = ""
                let shorthands = {}
                while (line[i]!="(") {
                    if (line[i]=="#") shorthands.inherit_previous = true;
                    i++
                }
                let level = 1
                while (true) {
                    i++;
                    c = line[i];
                    if (c==")") level--;
                    else if (c=="(") level++;
                    else if (c=="\\") {
                        i++;
                        metadata += line[i]
                    } else metadata += c;
                    if (level == 0) break;
                }
                // console.log(large_token_text,this.parse_metadata(metadata))
                let t = this.parse_metadata(metadata)
                t.T = large_token_text
                tokens.push(t)
                large_token_text = ""
            }
            i++;
        }
        return tokens
    }

    static parse_metadata(data) {

        return Object.fromEntries(([...data.matchAll(/(\w+):\s*((?:\\.|[^;])+)/g)]).map(v=>v.filter((w,i)=>i>0).map(v=>v.trim().replace(/\\$/,"").replace(/\\(.)/g,"$1")).map(v=>v===""?v:(isNaN(v)?({"true":true,"false":false})[v]??v:Number(v)))))
        
        // name: Joe; age: 5; speci: \;   \ ; test: false     ->     { name: "Joe", age: 5, speci: ";   ", test: false }
        // return Object.fromEntries(([...data.matchAll(/(\w+):\s*((?:\\.|[^;\{\}]|{(?:\\.|[^}])*})+)/g)]).map(v=>v.filter((w,i)=>i>0).map(v=>v.trim().replace(/\\$/,"").replace(/\\(.)/g,"$1")).map(v=>v===""?v:(isNaN(v)?({"true":true,"false":false})[v]??v:Number(v)))))
    }
}