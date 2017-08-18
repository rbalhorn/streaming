<?php
$num_monitors = 8; // set the number of monitor fields


// If m is passed, read "montior.json file"
if(isset($_GET['m']) && strlen($_GET['m']) <= 2){

    $feedback = 'watching for url updates';
    $content = '
    <script>
    var urlParams = new URLSearchParams(window.location.search);
    var m = urlParams.get("m");
    var oldurl = "";
    function getJSON(){
        $.getJSON("data/monitor.json?t=" + new Date().getTime(), function(data){
            if(oldurl != data[m]) {
                window.open(data[m], "_monitor");
            }
            oldurl = data[m];
            console.log(data);
        });
    }
    setInterval(getJSON, 5000);
    </script>';

} else { // if not monitor - then display form
    if(isset($_POST['save'])){ // first check if the form was submitted - if so, write the monitor.json file
        // chmod('data/monitor.json', 755);
        $myfile = fopen("data/monitor.json", "w") or die("Unable to write to file!");
        $txt = json_encode($_POST); // create JSON and put it as string here
        fwrite($myfile, $txt);
        fclose($myfile);
        $feedback = 'Saved';
    }

    // pull in previous data for form fill
    $monitor_file = fopen("data/monitor.json", "r") or die("Unable to open file!");
    $monitor_data = json_decode(fread($monitor_file, filesize("data/monitor.json")), true);
    fclose($monitor_file);

    // form display
    if(!isset($feedback)){
        $feedback = 'Enter the URL you want pushed to each monitor';
    }
    // display form and fill in values if previous POST
    $content = '<form action="'.$_SERVER["PHP_SELF"].'" method="post" id="form"><ul>';
    for ($i=1; $i < $num_monitors +1; $i++) {
        if(isset($_POST['save'])){
            $monitor_value = $_POST[$i]; // read info from last post
        } else {
            $monitor_value = $monitor_data[$i]; // if info from last post not available, use the info from the json file
        }
        $content .= '<li><label for="'.$i.'">Monitor '.$i.'</label></li><li><input type="text" name="'.$i.'" id="'.$i.'" value="'.$monitor_value.'" /></li>';
    }
    $content .= '<li><input type="submit" value="Save URLs" name="save" id="save" /></li></ul></form>';
}

?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Dynamic Monitor</title>
    <style type="text/css">
        body { margin: 0; padding: 0; font-family: sans-serif; color: #333; }
        div { padding: 2%; }
        #feedback { border: 1px solid #CCC; background: #efefef; margin: 2%;}
        .status { border: 1px solid #CCC; background: #efefef; margin: 2%;}
        form ul { list-style-type: none; margin: 0; }
        li { margin: 0.5em 0; padding: 0; }
        input { font-size: 0.85em; width: 96%; max-width: 720px; }
        input[type=submit], input[type=button] { max-width: 200px; margin: 8px 0 0 0; padding: 1% 2%; background:#ccc; border:0 none; cursor:pointer; -webkit-border-radius: 0px; border-radius: 0px; }
        label { display: block; padding-top: 8px;}
        label span { font-size: 0.75em; color: #777; }
        select { font-size: 0.85em; width: 96%; max-width: 400px; }
        select.date { font-size: 0.85em; width: 96%; max-width: 133px; }
        h2 { font-family: "Helvetica", "Arial", sans-serif; font-weight: 200; }
    </style>
</head>
<body>
<div>
        <div id="feedback"><?=$feedback; ?></div>
        <?=$content; ?>
</div>
<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>
</body>
</html>
