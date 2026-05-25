inherit RoomPlusCode;

void extra_create()
{
    set("short","The Principal's Office");
    set("day_long",
      "This is the office where Principal Ferguson spends about eighty "
      "percent of his school day, smoking, sweating, and going over "
      "students' permanent records.  There's a large pine desk in the "
      "middle of the room covered with folders, slowly rotting brown-nosers' "
      "apples, and kit-kat wrappers.  There are no windows in the office "
      "and a dank smell of stagnant sweat and of a sad life invades your "
      "cringing sinuses."
    );
    set("descs", ([
	({"desk","pine desk"}):
	"The desk is made of thin, unfinished pine.  The surface facing "
	"the door is scarred with the engravings of students forced to "
	"wait for Principal Ferguson's snivelling admonishments.  The "
	"surface of the desk is littered with manilla folders and papers.",
	({"folders","folder","manilla folders","manilla folder","paper","papers"}):
	"These folders of papers are the records of the students of EotL "
	"School.  You cannot seem to find your own file among them.  Perhaps "
	"in another year.",
	({"apples","apple","wrapper","wrappers","kit-kat wrapper","kit-kat wrappers"}):
	"The garbage on the desk seems to indicate that Principal Ferguson "
	"is more inclined to defer to his sweet tooth than to tend to his "
	"health.  Perhaps at home he is forced to consume healthier foods "
	"and thus sees his time in his office as a respite from fruit, a time "
	"to revel in the chocolatey goodness of the kit-kat bar.",
	({"engraving","engravings"}):
	"@randEngraving",
      ]) );
    set("reset_data",
      ([
	"principal": "/zone/null/eternal/school/principal"
      ]) );
    set("exits", ([
	"east":"/zone/null/eternal/school/room01.c"
      ]) );
}
status randEngraving(string foo)
{
    string *engrave;
    if(query_verb()=="read"&&(foo!="engraving"&&foo!="engravings"))return 0;
    engrave=({});
    engrave=grab_file("/zone/null/eternal/school/lessons/engrave");
    if(!sizeof(engrave)){
	write(strformat("The front of the desk bears few marks, "
	    "having recently been sanded down by Principal Ferguson."));
	return 1;
    }
    write(strformat(engrave[random(sizeof(engrave))],"The engraving reads: "));

    return 1;
}                
