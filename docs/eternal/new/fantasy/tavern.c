inherit RoomCode;
#include "path.h"
#define PASSWORD "The weed of evil bears bitter fruit"
#define PASSFILE HOME+"passfile"
#define DESTINATION TUNNELS + "basement"

void extra_create() {
    set("short","The Bloody Hell");
    set("day_long","This seedy, run-down bar reeks of vomit, and perhaps "+
               "some other common, yet unpleasant, bodily fluids.  A "+
               "bartender sits behind a counter, practicing making mean "+
               "faces in a hand mirror.  There are a few tavern-goers "+
               "here and there, but it's altogether not a social hot-spot."
               );
    set(InsideP,1);
    set(NoTeleportP,1);
    set("exits", ([
      "south" : "alley2",
      ]) );
}

void extra_init() {
    add_action("tellfun","tell");
}

status check_pass_ok(object ob) {
    string name,*oklist;
    
    name = ob->query_name();
    oklist = grab_file(PASSFILE);
    if (member(oklist,name) == -1) return 0; else return 1;
}

 
status tellfun(string arg) {
    string who, what;
    if (sscanf(arg,"%s %s",who,what) < 2) {
      notify_fail("Tell who what?\n");
      return 0;
      }
    if (who != "man" && who != "bartender") return 0;
    if (!check_pass_ok(THISP) || what != PASSWORD) {
      write("The bartender stares at you blankly.\n");
      return 1;
      }
    write( strformat( "The bartender subtly takes a look around, then kicks "
          "open a secret-like trap door and shoves you down it." ) );
    say("The bartender shoves "+PNAME+" down a trap door.\n");
    move_object(THISP,DESTINATION);
    command("glance",THISP);
    return 1;
}
