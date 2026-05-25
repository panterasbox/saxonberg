inherit ObjectCode;

void extra_create()
{
    set("id",({"chalkboard","board"}));
    set("short","a large, dark green chalkboard");
    set("long",
      "This is a large, wall-mounted chalkboard common in schoolrooms "
      "all over the known universe.  There is some writing on the "
      "board that you could read, if you are interested in "
      "furthering your education."
    );
    set("gettable",0);
}

void extra_init()
{
    add_action("do_read","read");
}

status do_read(string grunt)
{
    string mess;
    if(!id(grunt))return 0;
    mess=read_file("/zone/null/eternal/school/lessons/lesson"+query("lesson"));
    if(mess==""||!mess)
	mess=
	"Welcome to the EotL School!  Please take your seats!\n"
	"I am your teacher, Miss Dixie.\n";
    write("The chalkboard reads:\n\n");
    THISP->more_string(mess);
    write("\n");
    tell_room(ENV(THISO),PNAME+" reads the chalkboard.\n",({THISP}));
    return 1;
}

